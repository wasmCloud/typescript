import { Hono } from 'hono';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
import { getDirectories } from 'wasi:filesystem/preopens@0.2.2';

const app = new Hono();

// Helper: find a preopened directory by its guest path
function getPreopenDir(path: string) {
  const dirs = getDirectories();
  for (const [descriptor, dirPath] of dirs) {
    if (dirPath === path) {
      return descriptor;
    }
  }
  return null;
}

// List files in the preopened /data directory
app.get('/', (c) => {
  const dir = getPreopenDir('/data');
  if (!dir) {
    return c.text('No /data directory available\n', 500);
  }

  const entries = [];
  const stream = dir.readDirectory();
  let entry = stream.readDirectoryEntry();
  while (entry !== undefined) {
    entries.push({ name: entry.name, type: entry.type });
    entry = stream.readDirectoryEntry();
  }

  return c.json({ path: '/data', entries });
});

// Read a file from the /data directory
app.get('/read/:filename', (c) => {
  const dir = getPreopenDir('/data');
  if (!dir) {
    return c.text('No /data directory available\n', 500);
  }

  const filename = c.req.param('filename');

  const file = dir.openAt(
    { symlinkFollow: true },
    filename,
    {},
    { read: true },
  );

  const [data, _eof] = file.read(BigInt(1024 * 1024), BigInt(0));
  const text = new TextDecoder().decode(data);

  return c.text(text);
});

// Write a file to the /data directory
app.post('/write/:filename', async (c) => {
  const dir = getPreopenDir('/data');
  if (!dir) {
    return c.text('No /data directory available\n', 500);
  }

  const filename = c.req.param('filename');
  const body = await c.req.text();
  const encoded = new TextEncoder().encode(body);

  const file = dir.openAt(
    { symlinkFollow: true },
    filename,
    { create: true, truncate: true },
    { write: true },
  );

  const bytesWritten = file.write(encoded, BigInt(0));

  return c.json({ filename, bytesWritten: Number(bytesWritten) });
});

app.notFound((c) => {
  return c.text('Not found\n', 404);
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
