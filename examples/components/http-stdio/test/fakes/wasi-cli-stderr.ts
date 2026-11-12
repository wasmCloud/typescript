import { FakeOutputStream } from './output-stream.js';

// Every call returns the same stream, like the host's stderr.
export const stderr = new FakeOutputStream();

export function getStderr(): FakeOutputStream {
  return stderr;
}
