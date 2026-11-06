import { Hono } from 'hono';
import { getDirectories } from 'wasi:filesystem/preopens@0.2.2';

const app = new Hono();

/** Bytes read from a file per call. */
const READ_CHUNK = 64n * 1024n;

/** File names the routes accept: one path segment, no `.` or `..`. */
const FILENAME = /^[\w.-]{1,255}$/;

/** HTTP status for a wasi:filesystem error code. */
const STATUS_FOR_ERROR: Record<string, 400 | 403 | 404> = {
  'no-entry': 404,
  'is-directory': 400,
  'not-directory': 400,
  access: 403,
  'not-permitted': 403,
};

// Reject a file name that isn't a single, ordinary path segment.
// URLs already resolve `.` and `..` segments; they're checked here too in case a route changes.
function checkFilename(filename: string): boolean {
  return FILENAME.test(filename) && filename !== '.' && filename !== '..';
}

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
  if (!checkFilename(filename)) {
    return c.text('Invalid file name\n', 400);
  }

  const file = dir.openAt({ symlinkFollow: true }, filename, {}, { read: true });

  // Read until the end of the file
  const chunks: Uint8Array[] = [];
  let offset = 0n;
  for (;;) {
    const [data, eof] = file.read(READ_CHUNK, offset);
    chunks.push(data);
    offset += BigInt(data.length);
    if (eof || data.length === 0) {
      break;
    }
  }
  const text = new TextDecoder().decode(concat(chunks));

  return c.text(text);
});

// Write a file to the /data directory
app.post('/write/:filename', async (c) => {
  const dir = getPreopenDir('/data');
  if (!dir) {
    return c.text('No /data directory available\n', 500);
  }

  const filename = c.req.param('filename');
  if (!checkFilename(filename)) {
    return c.text('Invalid file name\n', 400);
  }
  const body = await c.req.text();
  const encoded = new TextEncoder().encode(body);

  const file = dir.openAt(
    { symlinkFollow: true },
    filename,
    { create: true, truncate: true },
    { write: true },
  );

  // A write may take fewer bytes than it's given, so write until all are written
  let bytesWritten = 0;
  while (bytesWritten < encoded.length) {
    const n = Number(file.write(encoded.subarray(bytesWritten), BigInt(bytesWritten)));
    if (n === 0) {
      throw new Error('write made no progress');
    }
    bytesWritten += n;
  }

  return c.json({ filename, bytesWritten });
});

app.notFound((c) => {
  return c.text('Not found\n', 404);
});

// Answer filesystem errors with a matching status instead of a bare 500
app.onError((err, c) => {
  const code = (err as { payload?: unknown }).payload;
  if (typeof code === 'string') {
    return c.text(`Filesystem error: ${code}\n`, STATUS_FOR_ERROR[code] ?? 500);
  }
  return c.text('Internal Server Error\n', 500);
});

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export { app };
