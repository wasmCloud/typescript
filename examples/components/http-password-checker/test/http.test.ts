import { expect, test } from 'vitest';
import { ErrorCode, Response, ResponseStatus } from '../src/http.js';

test('ok wraps data in a success envelope', () => {
  expect(Response.ok({ answer: 42 })).toEqual({
    status: ResponseStatus.Success,
    data: { answer: 42 },
  });
});

test('error wraps a code and message in an error envelope', () => {
  expect(Response.error(ErrorCode.InvalidRequest, 'nope')).toEqual({
    status: ResponseStatus.Error,
    error: { code: 'invalid-request', msg: 'nope' },
  });
});

test('error leaves the message out when none is given', () => {
  expect(Response.error(ErrorCode.UnexpectedError)).toEqual({
    status: 'error',
    error: { code: 'unexpected-error', msg: undefined },
  });
});

test('a new response defaults to success', () => {
  expect(new Response().status).toBe(ResponseStatus.Success);
});
