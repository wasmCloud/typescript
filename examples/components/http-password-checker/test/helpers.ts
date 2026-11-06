import { IncomingRequest } from './fakes/wasi-http-types.js';

/** Build a fake incoming request with a UTF-8 body split into small chunks */
export function request(method: string, path: string | undefined, body = ''): IncomingRequest {
  const bytes = new TextEncoder().encode(body);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    chunks.push(bytes.subarray(i, i + 3));
  }
  return new IncomingRequest({ tag: method }, path, chunks);
}
