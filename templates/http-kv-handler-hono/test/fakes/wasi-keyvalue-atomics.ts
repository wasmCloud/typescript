// An in-memory wasi:keyvalue/atomics.
// Counters live in the bucket itself, stored as decimal strings.
import type { Bucket } from './wasi-keyvalue-store.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function increment(bucket: Bucket, key: string, delta: bigint): bigint {
  const current = bucket.get(key);
  const next = (current ? BigInt(decoder.decode(current)) : 0n) + delta;
  bucket.set(key, encoder.encode(next.toString()));
  return next;
}
