// In-memory wasi:sockets/tcp-create-socket for a TCP server.
// Tests queue up clients before the server runs; the listener hands them
// out one at a time from accept(). Each client sends its chunks in order
// and then hangs up, and records everything the server writes back.
// Once every queued client has been accepted, accept() fails, which is the
// only way the server's accept loop ends.

type ErrorCode = 'invalid-state' | 'not-in-progress' | 'would-block';

interface Ipv4SocketAddress {
  port: number;
  address: [number, number, number, number];
}

export interface FakeClient {
  /** Chunks the client sends, in order, before closing. */
  chunks: string[];
  /** Everything the server wrote back, decoded. */
  received: string;
  /** Fail writes after this many have succeeded, as if the client vanished. */
  failWritesAfter?: number;
}

export interface FakeListener {
  family: string;
  network?: unknown;
  local?: { tag: 'ipv4'; val: Ipv4SocketAddress };
  /** Lifecycle steps in the order the server performed them. */
  steps: string[];
  /** How often the server blocked on the listener's pollable. */
  blocks: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const listeners: FakeListener[] = [];
const queue: FakeClient[] = [];

/** Queue a client that will send `chunks` and then close. */
export function connect(chunks: string[], options: { failWritesAfter?: number } = {}): FakeClient {
  const client: FakeClient = { chunks: [...chunks], received: '', ...options };
  queue.push(client);
  return client;
}

export function reset(): void {
  listeners.length = 0;
  queue.length = 0;
}

function streams(client: FakeClient) {
  let writes = 0;
  const input = {
    blockingRead(len: bigint): Uint8Array {
      const chunk = client.chunks.shift();
      if (chunk === undefined) throw { tag: 'closed' };
      const bytes = encoder.encode(chunk);
      if (bytes.length > len) throw new Error('fake client chunk exceeds read size');
      return bytes;
    },
    subscribe() {
      // Every chunk is already there, so the pollable is always ready.
      return { block: () => undefined };
    },
  };
  const output = {
    blockingWriteAndFlush(contents: Uint8Array): void {
      if (client.failWritesAfter !== undefined && writes >= client.failWritesAfter) {
        throw { tag: 'closed' };
      }
      writes++;
      client.received += decoder.decode(contents);
    },
  };
  return [input, output] as const;
}

export function createTcpSocket(family: string) {
  const state: FakeListener = { family, steps: [], blocks: 0 };
  listeners.push(state);

  function step(name: string, after: string, error: ErrorCode): void {
    if (state.steps.at(-1) !== after) throw error;
    state.steps.push(name);
  }

  const socket = {
    startBind(network: unknown, localAddress: { tag: 'ipv4'; val: Ipv4SocketAddress }): void {
      if (state.steps.length !== 0) throw 'invalid-state' satisfies ErrorCode;
      state.network = network;
      state.local = localAddress;
      state.steps.push('startBind');
    },
    finishBind(): void {
      step('finishBind', 'startBind', 'not-in-progress');
    },
    startListen(): void {
      step('startListen', 'finishBind', 'invalid-state');
    },
    finishListen(): void {
      step('finishListen', 'startListen', 'not-in-progress');
    },
    accept() {
      if (!state.steps.includes('finishListen')) throw 'invalid-state' satisfies ErrorCode;
      const client = queue.shift();
      if (!client) throw 'would-block' satisfies ErrorCode;
      return [socket, ...streams(client)] as const;
    },
    subscribe() {
      return {
        block(): void {
          state.blocks++;
        },
      };
    },
  };
  return socket;
}
