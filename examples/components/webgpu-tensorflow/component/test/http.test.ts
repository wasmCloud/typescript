import { describe, expect, test } from 'vitest';
import { readRequestBody, respond, respondJson } from '../src/http';
import { Request, Response } from './fakes/wasi-http-types';
import { created, wit } from './fakes/wit';

const encode = (s: string) => new TextEncoder().encode(s);
// The request type the component takes, without importing the WASI interface types.
type WasiRequest = Parameters<typeof readRequestBody>[0];
const asRequest = (request: Request) => request as unknown as WasiRequest;
const asFake = (response: unknown) => response as Response;

function lastFuture() {
  const future = created.at(-1);
  if (!future) throw new Error('no future was created');
  return future;
}

describe('readRequestBody', () => {
  test('reads every chunk of the body', async () => {
    const request = new Request({ tag: 'post' }, '/', [encode('hello, '), encode('world')]);

    expect(new TextDecoder().decode(await readRequestBody(asRequest(request)))).toBe(
      'hello, world',
    );
  });

  test('tells the host the body was consumed successfully', async () => {
    const request = new Request({ tag: 'post' }, '/');

    await readRequestBody(asRequest(request));

    const done = lastFuture();
    expect(done.value).toEqual({ tag: 'ok' });
    expect(done.type).toBe(wit.Future.RESULT_VOID_WASI_HTTP_TYPES_0_3_0_ERROR_CODE);
    expect(request.consumedWith).toBe(done.readable);
  });

  test('drops the body stream and trailers once read', async () => {
    const request = new Request({ tag: 'post' }, '/', [encode('x')]);

    await readRequestBody(asRequest(request));

    expect(request.body.dropped).toBe(true);
    expect(request.trailers.dropped).toBe(true);
  });

  test('drops the body stream and trailers when reading fails', async () => {
    const request = new Request({ tag: 'post' }, '/', [encode('x')], new Error('reset'));

    await expect(readRequestBody(asRequest(request))).rejects.toThrow('reset');
    expect(request.body.dropped).toBe(true);
    expect(request.trailers.dropped).toBe(true);
  });
});

describe('respond', () => {
  test('builds a response with the status, content type and body', async () => {
    const response = asFake(respond(201, 'text/plain', encode('made it')));

    expect(response.statusCode).toBe(201);
    expect(response.headers.text('content-type')).toBe('text/plain');
    expect(new TextDecoder().decode(await response.body())).toBe('made it');
  });

  test('ends the response with empty trailers', () => {
    const response = asFake(respond(200, 'text/plain', encode('')));
    const trailers = lastFuture();

    expect(trailers.value).toEqual({ tag: 'ok', val: null });
    expect(trailers.type).toBe(wit.Future.RESULT_OPTION_OTHER_ERROR_CODE);
    expect(response.trailers).toBe(trailers.readable);
  });

  test('rejects a status code the host would reject', () => {
    expect(() => respond(42, 'text/plain', encode(''))).toThrow('invalid status code 42');
  });

  test('respondJson serialises the value as application/json', async () => {
    const response = asFake(respondJson(400, { error: 'nope' }));

    expect(response.statusCode).toBe(400);
    expect(response.headers.text('content-type')).toBe('application/json');
    expect(JSON.parse(new TextDecoder().decode(await response.body()))).toEqual({ error: 'nope' });
  });
});
