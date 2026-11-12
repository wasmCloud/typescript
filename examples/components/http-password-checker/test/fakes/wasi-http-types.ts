// In-memory stand-ins for the `wasi:http/types` resources the component uses.
// Each one records what the component did to it,
// and enforces the same one-shot rules as the real resources,
// so tests can check the response that would go back to the host.

interface Method {
  tag: string;
  val?: string;
}

/** Error thrown by stream methods, shaped like jco's result errors */
export class StreamError extends Error {
  payload: { tag: 'closed' } | { tag: 'last-operation-failed'; val: unknown };

  constructor(payload: StreamError['payload']) {
    super(`stream error: ${payload.tag}`);
    this.payload = payload;
  }
}

/** Input stream that yields the given chunks, then reports it's closed */
export class InputStream {
  private chunks: Uint8Array[];
  reads: bigint[] = [];

  constructor(
    chunks: Uint8Array[],
    private readonly endWith: Error = new StreamError({ tag: 'closed' }),
  ) {
    this.chunks = [...chunks];
  }

  blockingRead(len: bigint): Uint8Array {
    this.reads.push(len);
    const chunk = this.chunks.shift();
    if (chunk === undefined) {
      throw this.endWith;
    }
    if (BigInt(chunk.length) > len) {
      this.chunks.unshift(chunk.subarray(Number(len)));
      return chunk.subarray(0, Number(len));
    }
    return chunk;
  }
}

export class OutputStream {
  written: number[] = [];
  disposed = false;

  blockingWriteAndFlush(contents: Uint8Array): void {
    if (this.disposed) {
      throw new Error('output stream used after it was disposed');
    }
    if (contents.length > 4096) {
      throw new StreamError({ tag: 'last-operation-failed', val: 'write exceeds 4096 bytes' });
    }
    this.written.push(...contents);
  }

  [Symbol.dispose](): void {
    this.disposed = true;
  }

  /** The bytes written so far, decoded as UTF-8 */
  text(): string {
    return new TextDecoder().decode(new Uint8Array(this.written));
  }
}

export class Fields {
  readonly entries: [string, Uint8Array][];

  constructor(entries: [string, Uint8Array][] = []) {
    this.entries = entries;
  }

  get(name: string): Uint8Array[] {
    return this.entries.filter(([key]) => key === name.toLowerCase()).map(([, value]) => value);
  }
}

export class IncomingBody {
  private streamTaken = false;

  constructor(private readonly inputStream: InputStream) {}

  stream(): InputStream {
    if (this.streamTaken) {
      throw new Error('incoming body stream already taken');
    }
    this.streamTaken = true;
    return this.inputStream;
  }
}

export class IncomingRequest {
  private consumed = false;
  private readonly body: IncomingBody;

  constructor(
    private readonly requestMethod: Method,
    private readonly path: string | undefined,
    chunks: Uint8Array[] = [],
    readonly headers: Fields = new Fields(),
  ) {
    this.body = new IncomingBody(new InputStream(chunks));
  }

  method(): Method {
    return this.requestMethod;
  }

  pathWithQuery(): string | undefined {
    return this.path;
  }

  consume(): IncomingBody {
    if (this.consumed) {
      throw new Error('incoming request body already consumed');
    }
    this.consumed = true;
    return this.body;
  }
}

export class OutgoingBody {
  readonly stream = new OutputStream();
  writeTaken = false;
  finished = false;
  trailers: Fields | undefined;

  write(): OutputStream {
    if (this.writeTaken) {
      throw new Error('outgoing body stream already taken');
    }
    this.writeTaken = true;
    return this.stream;
  }

  static finish(body: OutgoingBody, trailers: Fields | undefined): void {
    if (!body.stream.disposed) {
      throw new Error('outgoing body finished while its stream is still open');
    }
    body.finished = true;
    body.trailers = trailers;
  }
}

export class OutgoingResponse {
  statusCode = 200;
  outgoingBody: OutgoingBody | undefined;

  constructor(readonly headers: Fields) {}

  setStatusCode(statusCode: number): void {
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 999) {
      throw new Error(`invalid status code ${statusCode}`);
    }
    this.statusCode = statusCode;
  }

  body(): OutgoingBody {
    if (this.outgoingBody) {
      throw new Error('outgoing response body already taken');
    }
    this.outgoingBody = new OutgoingBody();
    return this.outgoingBody;
  }
}

export class ResponseOutparam {
  result: { tag: 'ok'; val: OutgoingResponse } | { tag: 'err'; val: unknown } | undefined;

  static set(param: ResponseOutparam, response: NonNullable<ResponseOutparam['result']>): void {
    if (param.result) {
      throw new Error('response outparam already set');
    }
    param.result = response;
  }

  /** The response the component sent, or a failure if it sent none */
  sent(): { status: number; body: string; finished: boolean } {
    if (this.result?.tag !== 'ok') {
      throw new Error('no response was sent');
    }
    const response = this.result.val;
    return {
      status: response.statusCode,
      body: response.outgoingBody?.stream.text() ?? '',
      finished: response.outgoingBody?.finished ?? false,
    };
  }
}
