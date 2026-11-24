import { afterEach, describe, expect, test, vi } from 'vitest';
import * as v from 'valibot';
import type {
  IncomingRequest as WasiIncomingRequest,
  ResponseOutparam as WasiResponseOutparam,
} from 'wasi:http/types@0.2.2';
import { incomingHandler } from '../src/http-password-checker.js';
import { PasswordCheckRequest } from '../src/api.js';
import { Response } from '../src/http.js';
import { ResponseOutparam } from './fakes/wasi-http-types.js';
import { request } from './helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

async function handle(method: string, path: string | undefined, body = '') {
  const resp = new ResponseOutparam();
  await incomingHandler.handle(
    request(method, path, body) as unknown as WasiIncomingRequest,
    resp as unknown as WasiResponseOutparam,
  );
  const sent = resp.sent();
  expect(sent.finished).toBe(true);
  return { status: sent.status, body: JSON.parse(sent.body) };
}

describe('incomingHandler.handle', () => {
  test('checks the password in a POST to /api/v1/check', async () => {
    const res = await handle('post', '/api/v1/check', JSON.stringify({ value: 'abC12$xyzW' }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: {
        strength: 'strong',
        length: 10,
        contains: expect.arrayContaining(['lowercase', 'uppercase', 'number', 'symbol']),
      },
    });
  });

  test('ignores the query string when routing', async () => {
    const res = await handle('post', '/api/v1/check?debug=1', JSON.stringify({ value: 'a' }));

    expect(res.status).toBe(200);
    expect(res.body.data.strength).toBe('very-weak');
  });

  test.each(['get', 'put', 'delete'])('rejects a %s request', async (method) => {
    const res = await handle(method, '/api/v1/check');

    expect(res).toEqual({
      status: 400,
      body: { status: 'error', message: 'invalid request, must be POST' },
    });
  });

  test.each(['/', '/api/v1/check/', '/api/v2/check'])(
    'rejects the unknown endpoint %s',
    async (path) => {
      const res = await handle('post', path, '{}');

      expect(res).toEqual({
        status: 400,
        body: {
          status: 'error',
          error: { code: 'invalid-request', msg: 'invalid API request (unknown endpoint)' },
        },
      });
    },
  );

  test('treats a request without a path as an unknown endpoint', async () => {
    const res = await handle('post', undefined);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid-request');
  });

  test('rejects a body that is not a check request', async () => {
    const res = await handle('post', '/api/v1/check', JSON.stringify({ password: 'x' }));

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(
      'invalid request body: [Invalid key: Expected "value" but received undefined]',
    );
  });

  test('reports the message of every validation issue', async () => {
    const parsed = v.safeParse(PasswordCheckRequest.schema(), {});
    if (parsed.success) throw new Error('an empty object should not parse');
    vi.spyOn(PasswordCheckRequest, 'fromRequest').mockRejectedValueOnce(
      new v.ValiError(parsed.issues),
    );

    const res = await handle('post', '/api/v1/check');

    expect(res.body.message).toBe(
      'invalid request body: [Invalid key: Expected "value" but received undefined]',
    );
  });

  test('reports the payload of an error that carries one', async () => {
    vi.spyOn(PasswordCheckRequest, 'fromRequest').mockRejectedValueOnce({ payload: 'bad stream' });

    const res = await handle('post', '/api/v1/check');

    expect(res.body.message).toBe('invalid request body: bad stream');
  });

  test('still answers when parsing fails with something other than an Error', async () => {
    vi.spyOn(PasswordCheckRequest, 'fromRequest').mockRejectedValueOnce(undefined);

    const res = await handle('post', '/api/v1/check');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('invalid request body: unexpected error while parsing request');
  });

  test('reports the message of a plain error', async () => {
    vi.spyOn(PasswordCheckRequest, 'fromRequest').mockRejectedValueOnce(new Error('bad json'));

    const res = await handle('post', '/api/v1/check');

    expect(res.body.message).toBe('invalid request body: bad json');
  });

  test('answers 500 when the check itself fails', async () => {
    vi.spyOn(Response, 'ok').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await handle('post', '/api/v1/check', JSON.stringify({ value: 'a' }));

    expect(res).toEqual({
      status: 500,
      body: {
        status: 'error',
        error: { code: 'unexpected-error', msg: 'failed to check password: Error: boom' },
      },
    });
  });
});
