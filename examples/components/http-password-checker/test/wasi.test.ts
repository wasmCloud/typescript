import { describe, expect, test } from 'vitest';
import type {
  InputStream as WasiInputStream,
  ResponseOutparam as WasiResponseOutparam,
} from 'wasi:http/types@0.2.2';
import { readInputStream, sendResponse, sendResponseJSON, sendResponseText } from '../src/wasi.js';
import { InputStream, ResponseOutparam, StreamError } from './fakes/wasi-http-types.js';

const encode = (s: string) => new TextEncoder().encode(s);
const asStream = (stream: InputStream) => stream as unknown as WasiInputStream;
const outparam = () => new ResponseOutparam();
const asOutparam = (resp: ResponseOutparam) => resp as unknown as WasiResponseOutparam;

describe('readInputStream', () => {
  test('reads every chunk until the stream is closed', () => {
    const stream = new InputStream([encode('hel'), encode('lo')]);

    expect(new TextDecoder().decode(readInputStream(asStream(stream)))).toBe('hello');
    expect(stream.reads).toEqual([4096n, 4096n, 4096n]);
  });

  test('stops at an empty chunk', () => {
    const stream = new InputStream([encode('a'), new Uint8Array(), encode('ignored')]);

    expect(readInputStream(asStream(stream))).toEqual(encode('a'));
  });

  test('reads in chunks of at most 4096 bytes', () => {
    const stream = new InputStream([new Uint8Array(5000).fill(1)]);

    expect(readInputStream(asStream(stream))).toHaveLength(5000);
    expect(stream.reads).toEqual([4096n, 4096n, 4096n]);
  });

  test('returns an empty buffer for a closed, empty stream', () => {
    expect(readInputStream(asStream(new InputStream([])))).toEqual(new Uint8Array());
  });

  test('rethrows errors other than the stream closing', () => {
    const failure = new StreamError({ tag: 'last-operation-failed', val: 'io' });
    const stream = new InputStream([encode('x')], failure);

    expect(() => readInputStream(asStream(stream))).toThrow(failure);
  });
});

describe('sending responses', () => {
  test('sendResponse writes the bytes and status, then finishes the body', async () => {
    const resp = outparam();

    await sendResponse(asOutparam(resp), 201, encode('created'));

    expect(resp.sent()).toEqual({ status: 201, body: 'created', finished: true });
  });

  test('sendResponse accepts a body of exactly 4096 bytes', async () => {
    const resp = outparam();

    await sendResponse(asOutparam(resp), 200, new Uint8Array(4096));

    expect(resp.sent().body).toHaveLength(4096);
  });

  test('sendResponse rejects bodies over 4096 bytes without sending anything', async () => {
    const resp = outparam();

    await expect(sendResponse(asOutparam(resp), 200, new Uint8Array(4097))).rejects.toThrow(
      'STREAMING RESPONSES NOT IMPLEMENTED YET',
    );
    expect(resp.result).toBeUndefined();
  });

  test('sendResponseText encodes the body as UTF-8', async () => {
    const resp = outparam();

    await sendResponseText(asOutparam(resp), 200, 'héllo');

    expect(resp.sent()).toEqual({ status: 200, body: 'héllo', finished: true });
  });

  test('sendResponseJSON serialises the body', async () => {
    const resp = outparam();

    await sendResponseJSON(asOutparam(resp), 404, { missing: true });

    expect(JSON.parse(resp.sent().body)).toEqual({ missing: true });
    expect(resp.sent().status).toBe(404);
  });
});
