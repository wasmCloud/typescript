// A `wasi:random/random` with a fixed byte pattern,
// so tests can work out exactly what a handler sends.
export const requests: bigint[] = [];

export function pattern(len: number): Uint8Array {
  return Uint8Array.from({ length: len }, (_, i) => (i * 31 + 7) & 0xff);
}

export function getRandomBytes(len: bigint): Uint8Array {
  requests.push(len);
  return pattern(Number(len));
}

export function getRandomU64(): bigint {
  return 4n;
}
