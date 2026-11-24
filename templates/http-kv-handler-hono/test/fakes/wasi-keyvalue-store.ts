// An in-memory wasi:keyvalue/store.
// Buckets are kept by name, so opening the same name twice sees the same data.

const buckets = new Map<string, Map<string, Uint8Array>>();

function makeBucket(data: Map<string, Uint8Array>) {
  return {
    get(key: string): Uint8Array | undefined {
      return data.get(key);
    },
    set(key: string, value: Uint8Array): void {
      data.set(key, value);
    },
    delete(key: string): void {
      data.delete(key);
    },
    exists(key: string): boolean {
      return data.has(key);
    },
    listKeys(cursor: string | undefined): { keys: string[]; cursor?: string } {
      if (cursor !== undefined) {
        throw new Error('cursors are not supported by this fake');
      }
      return { keys: [...data.keys()] };
    },
  };
}

export type Bucket = ReturnType<typeof makeBucket>;

export function open(identifier: string): Bucket {
  let data = buckets.get(identifier);
  if (!data) {
    data = new Map();
    buckets.set(identifier, data);
  }
  return makeBucket(data);
}
