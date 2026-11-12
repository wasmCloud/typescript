import { expect, test } from 'vitest';
import { incomingHandler } from '../src/http-hello-world.js';
import { IncomingRequest, OutgoingResponse, ResponseOutparam } from './fakes/wasi-http-types.js';

// The fakes stand in for the generated resource types the handler expects.
type Handle = (...args: unknown[]) => void;
const handle = incomingHandler.handle as unknown as Handle;

function serve(request = new IncomingRequest()) {
  const outparam = new ResponseOutparam();
  handle(request, outparam);
  if (outparam.result?.tag !== 'ok') {
    throw new Error('handler did not set a response');
  }
  return outparam.result.val as OutgoingResponse;
}

test('responds 200 with a greeting', () => {
  const response = serve();

  expect(response.statusCode()).toBe(200);
  expect(response.outgoingBody?.stream?.text()).toBe('Hello from Typescript!\n');
});

test('sends no headers or trailers', () => {
  const response = serve();

  expect(response.headers().entries).toEqual([]);
  expect(response.outgoingBody?.finished).toBe(true);
  expect(response.outgoingBody?.trailers).toBeUndefined();
});

test('flushes and disposes the body stream', () => {
  const stream = serve().outgoingBody?.stream;

  expect(stream?.flushes).toBe(1);
  expect(stream?.disposed).toBe(true);
});

test('answers every request the same way', () => {
  const response = serve(new IncomingRequest('POST', '/anything?x=1'));

  expect(response.statusCode()).toBe(200);
  expect(response.outgoingBody?.stream?.text()).toBe('Hello from Typescript!\n');
});
