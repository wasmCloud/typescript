// componentize-qjs runtime shapes for WIT streams and futures, as described in src/streams.ts.

/** A readable stream<u8> that yields the given chunks, then ends */
export class FakeByteStream implements AsyncIterator<Uint8Array> {
  dropped = false;
  private readonly chunks: Promise<Uint8Array[]>;
  private index = 0;

  constructor(
    chunks: Uint8Array[] | Promise<Uint8Array[]>,
    private readonly failWith?: Error,
  ) {
    this.chunks = Promise.resolve(chunks);
  }

  async next(): Promise<IteratorResult<Uint8Array>> {
    if (this.dropped) {
      throw new Error('stream read after it was dropped');
    }
    const chunks = await this.chunks;
    if (this.index < chunks.length) {
      return { done: false, value: chunks[this.index++] };
    }
    if (this.failWith) {
      throw this.failWith;
    }
    return { done: true, value: undefined };
  }

  drop(): void {
    this.dropped = true;
  }
}

/** A readable future<T> that resolves to the given value */
export class FakeFuture<T> {
  dropped = false;

  constructor(private readonly value: T | Promise<T>) {}

  read(): Promise<T> {
    return Promise.resolve(this.value);
  }

  drop(): void {
    this.dropped = true;
  }
}

/** Collect every chunk of an outgoing stream<u8> */
export async function collect(chunks: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const parts: number[] = [];
  for await (const chunk of chunks) {
    parts.push(...chunk);
  }
  return new Uint8Array(parts);
}
