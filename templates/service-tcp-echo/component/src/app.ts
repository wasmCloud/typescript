/**
 * HTTP front-end component for the TCP word-count service.
 *
 * Routes:
 *   GET  /       — health / info response
 *   POST /count  — accepts plain-text body, sends it to the word-count service
 *                  over loopback TCP, and returns a JSON response with the
 *                  word count.
 *
 * The word-count service runs as a wasmCloud service workload on the same
 * host. It listens on 127.0.0.1:7878 (the runtime rewrites 0.0.0.0 → loopback
 * for service workloads). Both this component and the service share the same
 * in-process loopback network, so the TCP connection succeeds.
 *
 * Protocol: line-oriented text.
 *   Component sends:  "hello world\n"
 *   Service replies:  "2\n"
 *
 * wasi:sockets client lifecycle (poll-based, two-phase async):
 *   createTcpSocket → startConnect/finishConnect → read reply → write text
 */

import { instanceNetwork } from 'wasi:sockets/instance-network@0.2.3';
import { createTcpSocket } from 'wasi:sockets/tcp-create-socket@0.2.3';

import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Types (mirrors of generated/types/interfaces/wasi-sockets-*.d.ts)
// ---------------------------------------------------------------------------

type Ipv4Address = [number, number, number, number];

interface Ipv4SocketAddress {
  port: number;
  address: Ipv4Address;
}

interface InputStream {
  blockingRead(len: bigint): Uint8Array;
}

interface OutputStream {
  blockingWriteAndFlush(contents: Uint8Array): void;
}

interface TcpSocket {
  startConnect(network: unknown, remoteAddress: { tag: 'ipv4'; val: Ipv4SocketAddress }): void;
  finishConnect(): [InputStream, OutputStream];
  subscribe(): { block(): void };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_HOST: Ipv4Address = [127, 0, 0, 1];
const SERVICE_PORT = 7878;

/** The most bytes one `blocking-write-and-flush` call takes. */
const MAX_WRITE = 4096;

/** A reply is a count and a newline; one longer than this is an error. */
const MAX_REPLY = 64;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// TCP helper — send one line to the word-count service, read back the count
// ---------------------------------------------------------------------------

/**
 * Connect to the word-count service, send `text` as a single line, and
 * return the integer word count.
 *
 * Throws if the connection or I/O fails.
 */
function queryWordCount(text: string): number {
  const network: unknown = instanceNetwork();
  const socket = createTcpSocket('ipv4') as TcpSocket;

  socket.startConnect(network, {
    tag: 'ipv4',
    val: { port: SERVICE_PORT, address: SERVICE_HOST },
  });
  socket.subscribe().block();
  const [inputStream, outputStream] = socket.finishConnect();

  // Strip any embedded newlines so the line-oriented protocol stays intact
  const line = text.replace(/[\r\n]+/g, ' ').trimEnd() + '\n';
  const bytes = encoder.encode(line);
  for (let offset = 0; offset < bytes.length; offset += MAX_WRITE) {
    outputStream.blockingWriteAndFlush(bytes.subarray(offset, offset + MAX_WRITE));
  }

  // Read back the reply ("N\n"), which may arrive in more than one chunk
  let reply = '';
  while (!reply.includes('\n')) {
    if (reply.length > MAX_REPLY) {
      throw new Error('Reply from word-count service is too long');
    }
    let chunk: Uint8Array;
    try {
      chunk = inputStream.blockingRead(BigInt(MAX_REPLY));
    } catch (err) {
      if (isStreamClosed(err)) {
        throw new Error('Word-count service closed the connection without replying', {
          cause: err,
        });
      }
      throw err;
    }
    reply += decoder.decode(chunk, { stream: true });
  }
  const countStr = reply.trim();
  const count = parseInt(countStr, 10);
  if (isNaN(count)) {
    throw new Error(`Unexpected reply from word-count service: ${JSON.stringify(countStr)}`);
  }
  return count;
}

/** Whether `err` is the stream error a closed connection raises. */
function isStreamClosed(err: unknown): boolean {
  return (err as { tag?: unknown } | null)?.tag === 'closed';
}

/** A readable message for an Error, a WASI error code, or a tagged WASI error. */
function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  const tag = (err as { tag?: unknown } | null)?.tag;
  return typeof tag === 'string' ? tag : String(err);
}

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

const app = new Hono();

app.get('/', (c) =>
  c.json({
    service: 'service-tcp-echo',
    description: 'HTTP front-end for the TCP word-count service',
    endpoints: {
      'POST /count': 'Send a plain-text body; get back the word count as JSON',
    },
  }),
);

/**
 * POST /count
 *
 * Request body: plain text (any encoding; treated as UTF-8)
 * Response:     { text: string; count: number }
 *
 * Example:
 *   curl -s -X POST -d "hello world" http://localhost:8080/count
 *   => { "text": "hello world", "count": 2 }
 */
app.post('/count', async (c) => {
  const text = await c.req.text();
  if (!text.trim()) {
    return c.json({ error: 'Request body must not be empty' }, 400);
  }

  let count: number;
  try {
    count = queryWordCount(text);
  } catch (err) {
    return c.json({ error: `Service error: ${describeError(err)}` }, 502);
  }

  return c.json({ text, count });
});

export { app };
