// An in-memory wasi:filesystem/preopens.
// `/data` is preopened as an empty directory.
// Tests can add files to it through `data`,
// or remove it from `preopens` to simulate a host that doesn't provide it.
import { makeDirectory, type Descriptor } from './wasi-filesystem-types.js';

export const data = makeDirectory();

export const preopens: [Descriptor, string][] = [
  [makeDirectory(), '/tmp'],
  [data, '/data'],
];

export function getDirectories(): [Descriptor, string][] {
  return preopens;
}
