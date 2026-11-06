import { afterEach, describe, expect, test } from 'vitest';
import { incomingHandler } from '../src/http-streaming.js';
import {
  IncomingRequest,
  OutgoingResponse,
  OutputStream,
  ResponseOutparam,
} from './fakes/wasi-http-types.js';
import { pattern, requests } from './fakes/wasi-random-random.js';

// The fakes stand in for the generated resource types the handler expects.
type Handle = (...args: unknown[]) => void;
const handle = incomingHandler.handle as unknown as Handle;

const ONE_MIB = 1024 * 1024;
const expectedBody = Buffer.from(pattern(ONE_MIB)).toString('base64');

function serve() {
  const outparam = new ResponseOutparam();
  handle(new IncomingRequest(), outparam);
  if (outparam.result?.tag !== 'ok') {
    throw new Error('handler did not set a response');
  }
  const response = outparam.result.val as OutgoingResponse;
  const stream = response.outgoingBody?.stream;
  if (!stream) {
    throw new Error('handler did not write a body');
  }
  return { response, stream };
}

afterEach(() => {
  OutputStream.capacity = 4096n;
  OutputStream.permits = [];
  requests.length = 0;
});

describe('when the stream accepts the whole body at once', () => {
  test('streams 1 MiB of base64-encoded random data', () => {
    OutputStream.capacity = BigInt(expectedBody.length);

    const { response, stream } = serve();

    expect(requests).toEqual([BigInt(ONE_MIB)]);
    expect(response.statusCode()).toBe(200);
    expect(stream.chunks).toHaveLength(1);
    expect(stream.text()).toBe(expectedBody);
  });

  test('waits on the pollable, flushes, and cleans up', () => {
    OutputStream.capacity = 2n * BigInt(expectedBody.length);

    const { response, stream } = serve();

    expect(stream.pollables).toHaveLength(1);
    expect(stream.pollables[0].blocks).toBe(1);
    expect(stream.pollables[0].disposed).toBe(true);
    expect(stream.flushes).toBe(1);
    expect(stream.disposed).toBe(true);
    expect(response.outgoingBody?.finished).toBe(true);
    expect(response.outgoingBody?.trailers).toBeUndefined();
  });
});

describe('when the stream applies back-pressure', () => {
  test('flushes and waits again while no bytes may be written', () => {
    OutputStream.permits = [0n, 0n];
    OutputStream.capacity = BigInt(expectedBody.length);

    const { stream } = serve();

    expect(stream.pollables[0].blocks).toBe(3);
    expect(stream.flushes).toBe(3);
    expect(stream.text()).toBe(expectedBody);
  });

  // The loop subtracts the running total (`written`) from `remaining`
  // instead of the chunk just written, so it stops early
  // and the client receives only a prefix of the data.
  test('sends a truncated body in small chunks (documents current behaviour)', () => {
    OutputStream.capacity = 4096n;

    const { response, stream } = serve();
    const body = stream.text();

    expect(response.statusCode()).toBe(200);
    expect(stream.chunks.every((chunk) => chunk.length <= 4096)).toBe(true);
    expect(expectedBody.startsWith(body)).toBe(true);
    expect(body.length).toBe(26 * 4096);
    expect(body.length).toBeLessThan(expectedBody.length);
  });
});
