import { FakeOutputStream } from './output-stream.js';

// Every call returns the same stream, like the host's stdout.
export const stdout = new FakeOutputStream();

export function getStdout(): FakeOutputStream {
  return stdout;
}
