// An in-memory `wasi:keyvalue/store`.
// Buckets live as long as the module, like a host's keyvalue backend.
export class Bucket {
  readonly identifier: string;
  readonly entries = new Map<string, Uint8Array>();

  constructor(identifier: string) {
    this.identifier = identifier;
  }

  get(key: string): Uint8Array | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: Uint8Array): void {
    this.entries.set(key, value);
  }
}

export const buckets = new Map<string, Bucket>();

export function open(identifier: string): Bucket {
  let bucket = buckets.get(identifier);
  if (!bucket) {
    bucket = new Bucket(identifier);
    buckets.set(identifier, bucket);
  }
  return bucket;
}
