// An in-memory loopback network standing in for `wasi:sockets/types@0.3.0`.
// Tests register a peer on a port; a TcpSocket that connects to it
// sends the peer its request bytes and receives the peer's reply.

import { FakeByteStream, FakeFuture, collect } from './streams.js';

export type IpAddressFamily = 'ipv4' | 'ipv6';
export type Ipv4Address = [number, number, number, number];
export interface IpSocketAddress {
  tag: 'ipv4';
  val: { port: number; address: Ipv4Address };
}

/** Error thrown by socket methods, shaped like jco's result errors */
export class SocketError extends Error {
  constructor(readonly payload: string) {
    super(payload);
  }
}

export interface Peer {
  /** Turn the bytes a client sent into the chunks it gets back */
  reply(request: Uint8Array): Uint8Array[] | Promise<Uint8Array[]>;
  /** Result of the client's send future */
  sendResult?: { tag: 'ok' } | { tag: 'err'; val: unknown };
}

export const loopback = new Map<string, Peer>();
export const sockets: TcpSocket[] = [];

const key = ({ val }: IpSocketAddress) => `${val.address.join('.')}:${val.port}`;

export class TcpSocket {
  remote: IpSocketAddress | undefined;
  sent: Promise<Uint8Array> | undefined;
  data: FakeByteStream | undefined;
  received: FakeFuture<unknown> | undefined;
  disposed = false;
  private peer: Peer | undefined;

  private constructor(readonly family: IpAddressFamily) {
    sockets.push(this);
  }

  static create(family: IpAddressFamily): TcpSocket {
    return new TcpSocket(family);
  }

  async connect(remote: IpSocketAddress): Promise<void> {
    const peer = loopback.get(key(remote));
    if (!peer) {
      throw new SocketError('connection-refused');
    }
    this.remote = remote;
    this.peer = peer;
  }

  send(data: AsyncIterable<Uint8Array>): FakeFuture<unknown> {
    const peer = this.requirePeer();
    this.sent = collect(data);
    return new FakeFuture(this.sent.then(() => peer.sendResult ?? { tag: 'ok' }));
  }

  receive(): [FakeByteStream, FakeFuture<unknown>] {
    const peer = this.requirePeer();
    const sent = this.sent ?? Promise.resolve(new Uint8Array());
    this.data = new FakeByteStream(sent.then((request) => peer.reply(request)));
    this.received = new FakeFuture({ tag: 'ok' });
    return [this.data, this.received];
  }

  [Symbol.dispose](): void {
    this.disposed = true;
  }

  private requirePeer(): Peer {
    if (!this.peer) {
      throw new SocketError('invalid-state');
    }
    return this.peer;
  }
}
