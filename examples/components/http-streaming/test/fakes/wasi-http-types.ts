// In-memory `wasi:http/types` (with the `wasi:io` streams and pollables it hands out).
// Each resource records what the handler did with it,
// so tests can assert the status, headers and body of the response.

type FieldName = string;
type FieldValue = Uint8Array;

export class Fields {
  readonly entries: [FieldName, FieldValue][] = [];

  static fromList(entries: [FieldName, FieldValue][]): Fields {
    const fields = new Fields();
    fields.entries.push(...entries);
    return fields;
  }

  get(name: FieldName): FieldValue[] {
    return this.entries.filter(([key]) => key === name.toLowerCase()).map(([, value]) => value);
  }

  append(name: FieldName, value: FieldValue): void {
    this.entries.push([name.toLowerCase(), value]);
  }
}

export class Pollable {
  blocks = 0;
  disposed = false;

  block(): void {
    this.blocks += 1;
  }

  [Symbol.dispose](): void {
    this.disposed = true;
  }
}

export class OutputStream {
  // How many bytes `checkWrite` permits, the first calls taking from `permits`.
  // Tests change these to drive a handler through back-pressure.
  static capacity = 4096n;
  static permits: bigint[] = [];

  readonly chunks: Uint8Array[] = [];
  readonly pollables: Pollable[] = [];
  readonly permits = [...OutputStream.permits];
  readonly capacity = OutputStream.capacity;
  flushes = 0;
  disposed = false;

  checkWrite(): bigint {
    return this.permits.shift() ?? this.capacity;
  }

  write(contents: Uint8Array): void {
    this.chunks.push(contents.slice());
  }

  blockingWriteAndFlush(contents: Uint8Array): void {
    this.write(contents);
    this.flush();
  }

  flush(): void {
    this.flushes += 1;
  }

  subscribe(): Pollable {
    const pollable = new Pollable();
    this.pollables.push(pollable);
    return pollable;
  }

  bytes(): Uint8Array {
    const out = new Uint8Array(this.chunks.reduce((n, chunk) => n + chunk.length, 0));
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  text(): string {
    return new TextDecoder().decode(this.bytes());
  }

  [Symbol.dispose](): void {
    this.disposed = true;
  }
}

export class OutgoingBody {
  stream?: OutputStream;
  finished = false;
  trailers?: Fields;

  static finish(body: OutgoingBody, trailers: Fields | undefined): void {
    if (body.finished) {
      throw new Error('outgoing body already finished');
    }
    body.finished = true;
    body.trailers = trailers;
  }

  write(): OutputStream {
    if (this.stream) {
      throw new Error('outgoing body stream already taken');
    }
    this.stream = new OutputStream();
    return this.stream;
  }
}

export class OutgoingResponse {
  readonly headersField: Fields;
  status = 200;
  outgoingBody?: OutgoingBody;

  constructor(headers: Fields) {
    this.headersField = headers;
  }

  statusCode(): number {
    return this.status;
  }

  setStatusCode(code: number): void {
    this.status = code;
  }

  headers(): Fields {
    return this.headersField;
  }

  body(): OutgoingBody {
    if (this.outgoingBody) {
      throw new Error('outgoing response body already taken');
    }
    this.outgoingBody = new OutgoingBody();
    return this.outgoingBody;
  }
}

type Result<T, E> = { tag: 'ok'; val: T } | { tag: 'err'; val: E };

export class ResponseOutparam {
  result?: Result<OutgoingResponse, unknown>;

  static set(param: ResponseOutparam, response: Result<OutgoingResponse, unknown>): void {
    if (param.result) {
      throw new Error('response outparam already set');
    }
    param.result = response;
  }
}

export class IncomingRequest {
  readonly methodValue: { tag: string };
  readonly path: string;
  readonly headersField: Fields;

  constructor(method = 'GET', path = '/', headers = new Fields()) {
    this.methodValue = { tag: method.toLowerCase() };
    this.path = path;
    this.headersField = headers;
  }

  method(): { tag: string } {
    return this.methodValue;
  }

  pathWithQuery(): string {
    return this.path;
  }

  headers(): Fields {
    return this.headersField;
  }
}
