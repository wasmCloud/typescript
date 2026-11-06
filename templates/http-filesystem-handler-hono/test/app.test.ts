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

  // The handler doesn't catch filesystem errors, so a missing file
  // falls through to Hono's default error handler.
  test('returns a 500 for a missing file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/read/missing.txt');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
  });

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
