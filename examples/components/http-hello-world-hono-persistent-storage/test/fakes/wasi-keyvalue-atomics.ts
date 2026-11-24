import type { Bucket } from './wasi-keyvalue-store.js';

// `wasi:keyvalue/atomics` stores counters as decimal strings,
// so a value set through the store can be incremented too.
export function increment(bucket: Bucket, key: string, delta: bigint): bigint {
  // jco passes a u64 as a bigint and rejects a number.
  if (typeof delta !== 'bigint') {
    throw new TypeError(`delta must be a bigint, got ${typeof delta}`);
  }
  const current = bucket.get(key);
  const value = (current ? BigInt(new TextDecoder().decode(current)) : 0n) + delta;
  bucket.set(key, new TextEncoder().encode(value.toString()));
  return value;
}
