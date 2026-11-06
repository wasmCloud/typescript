// In-memory values for wasi:blobstore/types.
// An outgoing value collects what is written to its body stream,
// and its bytes are only committed to a container once it is finished.

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function makeOutgoingValue() {
  const chunks: Uint8Array[] = [];
  return {
    chunks,
    /** Set by the container the value is written to. */
    commit: undefined as ((bytes: Uint8Array) => void) | undefined,
    outgoingValueWriteBody() {
      return {
        blockingWriteAndFlush(bytes: Uint8Array): void {
          chunks.push(bytes.slice());
        },
      };
    },
  };
}

export type FakeOutgoingValue = ReturnType<typeof makeOutgoingValue>;

export interface FakeIncomingValue {
  bytes: Uint8Array;
}

export const OutgoingValue = {
  newOutgoingValue: makeOutgoingValue,
  finish(value: FakeOutgoingValue): void {
    if (!value.commit) {
      throw new Error('outgoing value was never written to a container');
    }
    value.commit(concat(value.chunks));
  },
};

export const IncomingValue = {
  incomingValueConsumeSync(value: FakeIncomingValue): Uint8Array {
    return value.bytes;
  },
};
