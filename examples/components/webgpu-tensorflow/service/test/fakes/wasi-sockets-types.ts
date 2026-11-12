// An in-memory stand-in for the `wasi:sockets/types@0.3.0` server side the service uses.
// Tests queue client connections with `connect()` before the service listens;
// the listener yields them in order, then ends, which ends the service's accept loop.

import { FakeByteStream, FakeFuture, collect } from './streams.js';

export type IpAddressFamily = 'ipv4' | 'ipv6';
export type Ipv4Address = [number, number, number, number];
export interface IpSocketAddress {
  tag: 'ipv4';
  val: { port: number; address: Ipv4Address };
}
type SendResult = { tag: 'ok' } | { tag: 'err'; val: unknown };

/** Error thrown by socket methods, shaped like jco's result errors */
export class SocketError extends Error {
  constructor(readonly payload: { tag: string }) {
    super(`socket error: ${payload.tag}`);
  }
}

/** An accepted connection: what the client sends, and what the service sends back */
export class Connection {
  readonly data: FakeByteStream;
  readonly received = new FakeFuture<unknown>({ tag: 'ok' });
  readonly sent: Promise<Uint8Array>[] = [];
  disposed = false;

  constructor(
    chunks: Uint8Array[],
    private readonly sendResults: SendResult[] = [],
  ) {
    this.data = new FakeByteStream(chunks);
  }

  receive(): [FakeByteStream, FakeFuture<unknown>] {
    return [this.data, this.received];
  }

  send(data: AsyncIterable<Uint8Array>): FakeFuture<unknown> {
    const sent = collect(data);
    this.sent.push(sent);
    const result = this.sendResults.shift() ?? { tag: 'ok' };
    return new FakeFuture(sent.then(() => result));
  }

  [Symbol.dispose](): void {
    this.disposed = true;
  }

  /** Every frame the service sent on this connection */
  frames(): Promise<Uint8Array[]> {
    return Promise.all(this.sent);
  }
}

export const pending: Connection[] = [];
export const sockets: TcpSocket[] = [];

/** Queue a client connection for the next listener to accept */
export function connect(chunks: Uint8Array[], sendResults?: SendResult[]): Connection {
  const conn = new Connection(chunks, sendResults);
  pending.push(conn);
  return conn;
}

export class TcpSocket {
  bound: IpSocketAddress | undefined;
  listening = false;
  /** Set to make bind fail, as the host does for addresses it denies */
  static bindError: SocketError | undefined;

  private constructor(readonly family: IpAddressFamily) {
    sockets.push(this);
  }

  static create(family: IpAddressFamily): TcpSocket {
    return new TcpSocket(family);
  }

  bind(local: IpSocketAddress): void {
    if (TcpSocket.bindError) {
      throw TcpSocket.bindError;
    }
    this.bound = local;
  }

  listen(): AsyncIterable<Connection> {
    if (!this.bound) {
      throw new SocketError({ tag: 'invalid-state' });
    }
    this.listening = true;
    return (async function* () {
      for (let conn = pending.shift(); conn; conn = pending.shift()) {
        yield conn;
      }
    })();
  }
}
