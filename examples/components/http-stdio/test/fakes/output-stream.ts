// A `wasi:io/streams` output stream that keeps everything written to it.
export class FakeOutputStream {
  readonly chunks: Uint8Array[] = [];

  blockingWriteAndFlush(contents: Uint8Array): void {
    this.chunks.push(contents.slice());
  }

  text(): string {
    return this.chunks.map((chunk) => new TextDecoder().decode(chunk)).join('');
  }
}
