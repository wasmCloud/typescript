// In-memory wasi:sockets/tcp-create-socket for a TCP client.
// Each socket connects to a simulated peer that, by default, behaves like
// the word-count service: every line written to it is answered with
// "<count>\n". Tests can swap the peer, refuse the connection,
// or have the peer close without replying.

type ErrorCode = 'connection-refused' | 'invalid-state' | 'not-in-progress';

interface Ipv4SocketAddress {
  port: number;
  address: [number, number, number, number];
}

/** Turns one line received by the peer into the bytes it writes back. */
type Peer = (line: string) => string;

export interface FakeSocket {
  family: string;
  network?: unknown;
  remote?: { tag: 'ipv4'; val: Ipv4SocketAddress };
  /** Everything the client wrote, decoded. */
  sent: string;
  /** How often the client blocked on the socket's pollable. */
  blocks: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function wordCountPeer(line: string): string {
  const trimmed = line.trim();
  return `${trimmed === '' ? 0 : trimmed.split(/\s+/).length}\n`;
}

export const sockets: FakeSocket[] = [];
let peer: Peer = wordCountPeer;
let connectError: ErrorCode | undefined;

/** Answer lines with `fn` instead of the word-count service. */
export function setPeer(fn: Peer): void {
  peer = fn;
}

/** Make finishConnect() fail with `code`, as if nothing is listening. */
export function refuseConnections(code: ErrorCode = 'connection-refused'): void {
  connectError = code;
}

export function reset(): void {
  sockets.length = 0;
  peer = wordCountPeer;
  connectError = undefined;
}

export function createTcpSocket(family: string) {
  const state: FakeSocket = { family, sent: '', blocks: 0 };
  sockets.push(state);

  // Bytes the peer has written back that the client hasn't read yet
  let pending = new Uint8Array();
  let lineBuf = '';

  const input = {
    blockingRead(len: bigint): Uint8Array {
      if (pending.length === 0) {
        // The peer has nothing more to say and has hung up.
        throw { tag: 'closed' };
      }
      const chunk = pending.slice(0, Number(len));
      pending = pending.slice(chunk.length);
      return chunk;
    },
  };

  const output = {
    blockingWriteAndFlush(contents: Uint8Array): void {
      const text = decoder.decode(contents);
      state.sent += text;
      lineBuf += text;
      let reply = '';
      let newline: number;
      while ((newline = lineBuf.indexOf('\n')) !== -1) {
        reply += peer(lineBuf.slice(0, newline));
        lineBuf = lineBuf.slice(newline + 1);
      }
      const bytes = encoder.encode(reply);
      const next = new Uint8Array(pending.length + bytes.length);
      next.set(pending);
      next.set(bytes, pending.length);
      pending = next;
    },
  };

  return {
    startConnect(network: unknown, remoteAddress: { tag: 'ipv4'; val: Ipv4SocketAddress }): void {
      if (state.remote) throw 'invalid-state' satisfies ErrorCode;
      state.network = network;
      state.remote = remoteAddress;
    },
    finishConnect(): [typeof input, typeof output] {
      if (!state.remote) throw 'not-in-progress' satisfies ErrorCode;
      if (connectError) throw connectError;
      return [input, output];
    },
    subscribe() {
      return {
        block(): void {
          state.blocks++;
        },
      };
    },
  };
}
