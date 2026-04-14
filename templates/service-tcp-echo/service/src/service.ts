/**
 * TCP word-count service.
 *
 * A wasmCloud v2 service that exports wasi:cli/run. The runtime calls run()
 * once and expects it to block indefinitely — the server loop runs here.
 *
 * Protocol: line-oriented text over TCP.
 *   Client sends:  "hello world\n"
 *   Server replies: "2\n"          (word count of the line)
 *
 * The service binds to 0.0.0.0:7878. The wasmCloud runtime rewrites
 * unspecified-address binds to 127.0.0.1 (loopback), so the service is only
 * reachable by other workloads in the same deployment — not from external
 * callers.
 *
 * Connections are handled one at a time (sequentially) because SpiderMonkey
 * runs synchronously. Each connection may send multiple lines before closing.
 *
 * wasi:sockets server lifecycle (poll-based, two-phase async):
 *   createTcpSocket → startBind/finishBind → startListen/finishListen
 *   → loop: subscribe().block() → accept() → read lines → write counts
 *
 * wasi:io/streams reading pattern:
 *   inputStream.blockingRead(n) blocks until data is available, returns
 *   Uint8Array. Throws with { tag: 'closed' } on EOF.
 */

import { instanceNetwork } from 'wasi:sockets/instance-network@0.2.3';
import { createTcpSocket } from 'wasi:sockets/tcp-create-socket@0.2.3';

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
  subscribe(): { block(): void };
}

interface OutputStream {
  blockingWriteAndFlush(contents: Uint8Array): void;
}

interface TcpSocket {
  startBind(network: unknown, localAddress: { tag: 'ipv4'; val: Ipv4SocketAddress }): void;
  finishBind(): void;
  startListen(): void;
  finishListen(): void;
  accept(): [TcpSocket, InputStream, OutputStream];
  subscribe(): { block(): void };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = 7878;
// 0.0.0.0 — the runtime rewrites this to 127.0.0.1 (loopback-only for services)
const BIND_ADDR: Ipv4Address = [0, 0, 0, 0];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// Word count helper
// ---------------------------------------------------------------------------

function countWords(line: string): number {
  const trimmed = line.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

/**
 * Handle a single accepted TCP connection.
 *
 * Reads bytes from inputStream, accumulates them until a newline, counts
 * words in the line, and writes back "<count>\n". Loops until the client
 * closes the connection (blockingRead throws { tag: 'closed' }).
 */
function handleConnection(inputStream: InputStream, outputStream: OutputStream): void {
  const lineBuf: number[] = [];

  while (true) {
    let chunk: Uint8Array;
    try {
      chunk = inputStream.blockingRead(1024n);
    } catch {
      // { tag: 'closed' } — client disconnected
      break;
    }

    for (const byte of chunk) {
      if (byte === 0x0a /* '\n' */) {
        const line = decoder.decode(new Uint8Array(lineBuf));
        const count = countWords(line);
        try {
          outputStream.blockingWriteAndFlush(encoder.encode(`${count}\n`));
        } catch {
          return; // write failed — client gone
        }
        lineBuf.length = 0;
      } else {
        lineBuf.push(byte);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// wasi:cli/run export
// ---------------------------------------------------------------------------

/**
 * wasi:cli/run interface export.
 *
 * componentize-js maps `export wasi:cli/run` to a named export object `run`
 * with a `run()` method. The wasmCloud runtime calls `run.run()` once when
 * the service workload starts and expects it to block indefinitely.
 */
export const run = {
  run(): void {
    const network: unknown = instanceNetwork();
    const socket = createTcpSocket('ipv4') as TcpSocket;

    // --- Bind ---
    socket.startBind(network, { tag: 'ipv4', val: { port: PORT, address: BIND_ADDR } });
    socket.subscribe().block();
    socket.finishBind();

    // --- Listen ---
    socket.startListen();
    socket.subscribe().block();
    socket.finishListen();

    console.log(`[tcp-service] word-count server listening on port ${PORT}`);

    // --- Accept loop ---
    while (true) {
      // Wait for an incoming connection
      socket.subscribe().block();
      let conn: TcpSocket, inputStream: InputStream, outputStream: OutputStream;
      try {
        [conn, inputStream, outputStream] = socket.accept();
      } catch {
        // Accept error (e.g. listener socket closed) — stop
        break;
      }

      // Handle the connection synchronously before accepting the next one.
      // SpiderMonkey runs single-threaded, so connections are serialized.
      void conn; // conn is the accepted socket resource; not used directly
      handleConnection(inputStream, outputStream);
    }
  },
};
