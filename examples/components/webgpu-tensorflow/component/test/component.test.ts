import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { handler } from '../src/component';
import { u32BE } from '../src/streams';
import { Request } from './fakes/wasi-http-types';
import type { Response } from './fakes/wasi-http-types';
import { loopback } from './fakes/wasi-sockets-types';

// The request type the component takes, without importing the WASI interface types.
type WasiRequest = Parameters<typeof handler.handle>[0];

const encode = (s: string) => new TextEncoder().encode(s);
const decode = (b: Uint8Array) => new TextDecoder().decode(b);
const staticFile = (path: string) =>
  readFileSync(new URL(`../src/static/${path}`, import.meta.url));
const dataUrl = (bytes: Uint8Array, mime = 'image/jpeg') =>
  `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

afterEach(() => {
  loopback.clear();
  vi.restoreAllMocks();
});

async function handle(method: string, path: string | undefined, body?: string) {
  const request = new Request({ tag: method }, path, body === undefined ? [] : [encode(body)]);
  const response = (await handler.handle(request as unknown as WasiRequest)) as unknown as Response;
  return {
    status: response.statusCode,
    contentType: response.headers.text('content-type'),
    body: await response.body(),
  };
}

function stylizeBody(content: Uint8Array, style: Uint8Array) {
  return JSON.stringify({
    contentImage: { dataUrl: dataUrl(content), width: 256, height: 192 },
    styleImage: { dataUrl: dataUrl(style), width: 256, height: 256 },
  });
}

describe('static assets', () => {
  test.each([
    ['/', 'index.html', 'text/html'],
    ['/styles.css', 'styles.css', 'text/css'],
    ['/script.js', 'script.js', 'application/javascript'],
    ['/images/content/statue-of-liberty.jpg', 'images/content/statue-of-liberty.jpg', 'image/jpeg'],
    [
      '/images/content/lincoln-memorial-illuminated.jpg',
      'images/content/lincoln-memorial-illuminated.jpg',
      'image/jpeg',
    ],
    ['/images/style/cartoon.jpg', 'images/style/cartoon.jpg', 'image/jpeg'],
    ['/images/style/pen-and-ink.jpg', 'images/style/pen-and-ink.jpg', 'image/jpeg'],
  ])('serves %s', async (path, file, contentType) => {
    const res = await handle('get', path);

    expect(res.status).toBe(200);
    expect(res.contentType).toBe(contentType);
    expect(Buffer.from(res.body).equals(staticFile(file))).toBe(true);
  });

  test('ignores the query string', async () => {
    const res = await handle('get', '/styles.css?v=2');

    expect(res.status).toBe(200);
    expect(res.contentType).toBe('text/css');
  });

  test('serves the index when the request has no path', async () => {
    const res = await handle('get', undefined);

    expect(res.status).toBe(200);
    expect(res.contentType).toBe('text/html');
  });

  test.each(['/missing.html', '/index.html', '/images/'])('answers 404 for %s', async (path) => {
    const res = await handle('get', path);

    expect(res).toEqual({ status: 404, contentType: 'text/plain', body: encode('404 Not Found') });
  });
});

describe('routing', () => {
  test.each([
    ['put', '/stylize'],
    ['delete', '/'],
    ['post', '/'],
    ['post', '/stylize/'],
  ])('answers 405 for %s %s', async (method, path) => {
    const res = await handle(method, path, '');

    expect(res).toEqual({
      status: 405,
      contentType: 'text/plain',
      body: encode('405 Method Not Allowed'),
    });
  });

  // GET /stylize is looked up as a static asset, so it's 404 rather than 405.
  test('answers 404 for GET /stylize', async () => {
    expect((await handle('get', '/stylize')).status).toBe(404);
  });
});

describe('POST /stylize', () => {
  test('forwards both images to the service and returns the stylized JPEG', async () => {
    const requests: Uint8Array[] = [];
    loopback.set('127.0.0.1:7878', {
      reply(request) {
        requests.push(request);
        return [new Uint8Array([0]), u32BE(3), new Uint8Array([0xff, 0xd8, 0xff])];
      },
    });
    const log = vi.spyOn(console, 'log').mockReturnValue(undefined);

    const res = await handle(
      'post',
      '/stylize?quality=high',
      stylizeBody(encode('CC'), encode('S')),
    );

    expect(res).toEqual({
      status: 200,
      contentType: 'image/jpeg',
      body: new Uint8Array([0xff, 0xd8, 0xff]),
    });
    expect(requests).toEqual([new Uint8Array([0, 0, 0, 2, 67, 67, 0, 0, 0, 1, 83])]);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[component\] stylize roundtrip: \d+\.\d{2}s$/),
    );
  });

  test.each([
    ['a body that is not JSON', 'not json', /^Bad request: .*JSON/],
    ['a body without a style image', JSON.stringify({ contentImage: {} }), /^Bad request: /],
    [
      'an image that is not a data URL',
      JSON.stringify({
        contentImage: { dataUrl: 'http://x/a.jpg', width: 1, height: 1 },
        styleImage: { dataUrl: 'data:image/jpeg;base64,AA==', width: 1, height: 1 },
      }),
      /^Bad request: Invalid data URL$/,
    ],
    [
      'an image that is not base64',
      JSON.stringify({
        contentImage: { dataUrl: 'data:image/jpeg;base64,AA==', width: 1, height: 1 },
        styleImage: { dataUrl: 'data:image/jpeg,raw', width: 1, height: 1 },
      }),
      /^Bad request: Only base64 data URLs are supported$/,
    ],
  ])('answers 400 for %s', async (_, body, message) => {
    const res = await handle('post', '/stylize', body);

    expect(res.status).toBe(400);
    expect(res.contentType).toBe('application/json');
    expect(JSON.parse(decode(res.body)).error).toMatch(message);
  });

  test('answers 400 when the body ends with a non-Error value', async () => {
    const request = new Request({ tag: 'post' }, '/stylize');
    vi.spyOn(request.body, 'next').mockRejectedValueOnce('stream reset');

    const response = (await handler.handle(
      request as unknown as WasiRequest,
    )) as unknown as Response;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(decode(await response.body()))).toEqual({
      error: 'Bad request: stream reset',
    });
  });

  test('answers 502 with the service error', async () => {
    loopback.set('127.0.0.1:7878', {
      reply: () => [new Uint8Array([1]), u32BE(4), encode('busy')],
    });
    const error = vi.spyOn(console, 'error').mockReturnValue(undefined);

    const res = await handle('post', '/stylize', stylizeBody(encode('C'), encode('S')));

    expect(res.status).toBe(502);
    expect(JSON.parse(decode(res.body))).toEqual({ error: 'Service error: busy' });
    expect(error).toHaveBeenCalledWith('[component] service call failed:', 'busy');
  });

  test('answers 502 when the service is not running', async () => {
    vi.spyOn(console, 'error').mockReturnValue(undefined);

    const res = await handle('post', '/stylize', stylizeBody(encode('C'), encode('S')));

    expect(res.status).toBe(502);
    expect(JSON.parse(decode(res.body))).toEqual({ error: 'Service error: connection-refused' });
  });

  test('answers 502 when the service call fails with a non-Error value', async () => {
    loopback.set('127.0.0.1:7878', {
      reply: () => Promise.reject('peer vanished'),
    });
    vi.spyOn(console, 'error').mockReturnValue(undefined);

    const res = await handle('post', '/stylize', stylizeBody(encode('C'), encode('S')));

    expect(res.status).toBe(502);
    expect(JSON.parse(decode(res.body))).toEqual({ error: 'Service error: peer vanished' });
  });
});
