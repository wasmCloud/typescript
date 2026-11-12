import { beforeEach, describe, expect, test, vi } from 'vitest';

// The filesystem fake keeps its files in the module, so each test loads a fresh copy.
let app: typeof import('../src/app.js').app;
let fs: typeof import('./fakes/wasi-filesystem-preopens.js');

beforeEach(async () => {
  vi.resetModules();
  ({ app } = await import('../src/app.js'));
  fs = await import('./fakes/wasi-filesystem-preopens.js');
});

function writeFile(name: string, text: string): void {
  fs.data
    .openAt({}, name, { create: true }, { write: true })
    .write(new TextEncoder().encode(text), 0n);
}

function readFile(name: string): string {
  const [bytes] = fs.data.openAt({}, name, {}, { read: true }).read(1_000_000n, 0n);
  return new TextDecoder().decode(bytes);
}

function withoutData(): void {
  fs.preopens.splice(
    fs.preopens.findIndex(([, path]) => path === '/data'),
    1,
  );
}

describe('GET /', () => {
  test('sets security headers', async () => {
    const res = await app.request('/');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  test('lists an empty directory', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ path: '/data', entries: [] });
  });

  test('lists files and directories', async () => {
    writeFile('a.txt', 'a');
    fs.data.openAt({}, 'sub', { create: true, directory: true }, {});
    const res = await app.request('/');
    expect(await res.json()).toEqual({
      path: '/data',
      entries: [
        { name: 'a.txt', type: 'regular-file' },
        { name: 'sub', type: 'directory' },
      ],
    });
  });

  test('returns 500 when /data is not preopened', async () => {
    withoutData();
    const res = await app.request('/');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('No /data directory available\n');
  });
});

describe('GET /read/:filename', () => {
  test('returns the file contents', async () => {
    writeFile('hello.txt', 'Hello, world!');
    const res = await app.request('/read/hello.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(await res.text()).toBe('Hello, world!');
  });

  test('returns an empty body for an empty file', async () => {
    writeFile('empty.txt', '');
    const res = await app.request('/read/empty.txt');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  test('returns a 404 for a missing file', async () => {
    const res = await app.request('/read/missing.txt');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Filesystem error: no-entry\n');
  });

  test('returns a 400 for a directory', async () => {
    fs.data.openAt({}, 'sub', { create: true, directory: true }, {});
    const res = await app.request('/read/sub');
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Filesystem error: is-directory\n');
  });

  test('returns the whole of a file larger than one read', async () => {
    const text = 'abcdefgh'.repeat(40_000); // 320 KB, five 64 KiB reads
    writeFile('big.txt', text);
    const res = await app.request('/read/big.txt');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(text);
  });

  // URLs resolve `.` and `..` segments before routing, so names like these are what reach the check.
  test.each(['a%2Fb', 'a%5Cb', 'a%20b', 'x'.repeat(256)])(
    'rejects the file name %s',
    async (name) => {
      const res = await app.request(`/read/${name}`);
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('Invalid file name\n');
    },
  );

  test('returns 500 when /data is not preopened', async () => {
    withoutData();
    const res = await app.request('/read/hello.txt');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('No /data directory available\n');
  });
});

describe('POST /write/:filename', () => {
  test('creates a file with the request body', async () => {
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'héllo' });
    expect(res.status).toBe(200);
    // bytesWritten counts UTF-8 bytes, not characters.
    expect(await res.json()).toEqual({ filename: 'note.txt', bytesWritten: 6 });
    expect(readFile('note.txt')).toBe('héllo');
  });

  test('replaces the contents of an existing file', async () => {
    writeFile('note.txt', 'a much longer original text');
    await app.request('/write/note.txt', { method: 'POST', body: 'short' });
    expect(readFile('note.txt')).toBe('short');
  });

  test('keeps writing when a write takes only part of the body', async () => {
    const types = await import('./fakes/wasi-filesystem-types.js');
    types.limits.maxWrite = 3;
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'a longer body' });
    expect(await res.json()).toEqual({ filename: 'note.txt', bytesWritten: 13 });
    expect(readFile('note.txt')).toBe('a longer body');
  });

  test('fails rather than loop when a write makes no progress', async () => {
    const types = await import('./fakes/wasi-filesystem-types.js');
    types.limits.maxWrite = 0;
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'x' });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error\n');
  });

  test('rejects an invalid file name', async () => {
    const res = await app.request('/write/a%2F..%2Fb', { method: 'POST', body: 'x' });
    expect(res.status).toBe(400);
  });

  test('maps a permission error to 403', async () => {
    vi.spyOn(fs.data, 'openAt').mockImplementationOnce(() => {
      throw Object.assign(new Error('access'), { payload: 'access' });
    });
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'x' });
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('Filesystem error: access\n');
  });

  test('answers an unknown filesystem error with 500', async () => {
    vi.spyOn(fs.data, 'openAt').mockImplementationOnce(() => {
      throw Object.assign(new Error('io'), { payload: 'io' });
    });
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'x' });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Filesystem error: io\n');
  });

  test('round-trips through /read', async () => {
    await app.request('/write/note.txt', { method: 'POST', body: 'round trip' });
    expect(await (await app.request('/read/note.txt')).text()).toBe('round trip');
  });

  test('returns 500 when /data is not preopened', async () => {
    withoutData();
    const res = await app.request('/write/note.txt', { method: 'POST', body: 'x' });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('No /data directory available\n');
  });
});

describe('errors', () => {
  test('unknown paths return a plain-text 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found\n');
  });
});
