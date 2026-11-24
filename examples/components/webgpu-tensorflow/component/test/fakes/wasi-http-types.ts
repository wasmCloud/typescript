// In-memory stand-ins for the `wasi:http/types@0.3.0` resources the component uses.

import { FakeByteStream, FakeFuture, collect } from './streams.js';

interface Method {
  tag: string;
  val?: string;
}

export class Fields {
  readonly entries: [string, Uint8Array][];

  private constructor(entries: [string, Uint8Array][]) {
    this.entries = entries;
  }

  static fromList(entries: [string, Uint8Array][]): Fields {
    return new Fields(entries.map(([name, value]) => [name.toLowerCase(), value]));
  }

  /** The first value of a field, decoded as UTF-8 */
  text(name: string): string | undefined {
    const entry = this.entries.find(([key]) => key === name.toLowerCase());
    return entry && new TextDecoder().decode(entry[1]);
  }
}

export class Request {
  body: FakeByteStream;
  trailers = new FakeFuture<unknown>({ tag: 'ok', val: undefined });
  consumedWith: unknown;
  private consumed = false;

  constructor(
    private readonly method: Method,
    private readonly path: string | undefined,
    chunks: Uint8Array[] = [],
    failWith?: Error,
  ) {
    this.body = new FakeByteStream(chunks, failWith);
  }

  getMethod(): Method {
    return this.method;
  }

  getPathWithQuery(): string | undefined {
    return this.path;
  }

  static consumeBody(request: Request, done: unknown): [FakeByteStream, FakeFuture<unknown>] {
    if (request.consumed) {
      throw new Error('request body already consumed');
    }
    request.consumed = true;
    request.consumedWith = done;
    return [request.body, request.trailers];
  }
}

export class Response {
  statusCode = 200;

  private constructor(
    readonly headers: Fields,
    readonly contents: AsyncIterable<Uint8Array>,
    readonly trailers: unknown,
  ) {}

  static new(
    headers: Fields,
    contents: AsyncIterable<Uint8Array>,
    trailers: unknown,
  ): [Response, FakeFuture<unknown>] {
    return [new Response(headers, contents, trailers), new FakeFuture({ tag: 'ok' })];
  }

  setStatusCode(statusCode: number): void {
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 999) {
      throw new Error(`invalid status code ${statusCode}`);
    }
    this.statusCode = statusCode;
  }

  /** Read the whole response body */
  body(): Promise<Uint8Array> {
    return collect(this.contents);
  }
}
