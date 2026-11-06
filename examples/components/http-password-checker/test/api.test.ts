import { describe, expect, test } from 'vitest';
import type { IncomingRequest as WasiIncomingRequest } from 'wasi:http/types@0.2.2';
import { PasswordCheckRequest, handlePasswordCheck } from '../src/api.js';
import { PasswordStrength } from '../src/passwords.js';
import { request } from './helpers.js';

const fromBody = (body: string) =>
  PasswordCheckRequest.fromRequest(
    request('post', '/api/v1/check', body) as unknown as WasiIncomingRequest,
  );

describe('PasswordCheckRequest.fromRequest', () => {
  test('parses the value out of a JSON body', async () => {
    const cr = await fromBody(JSON.stringify({ value: 'hunter2', extra: 1 }));

    expect(cr).toBeInstanceOf(PasswordCheckRequest);
    expect(cr.value).toBe('hunter2');
  });

  test('rejects a body that is not JSON', async () => {
    await expect(fromBody('not json')).rejects.toThrow(
      /^failed to parse incoming data as a PasswordCheckRequest: SyntaxError/,
    );
  });

  test('rejects a body without a string value', async () => {
    const err = await fromBody(JSON.stringify({ value: 7 })).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(
      /^failed to parse incoming data as a PasswordCheckRequest: ValiError/,
    );
    expect((err as Error).cause).toMatchObject({ name: 'ValiError' });
  });

  test('rejects an empty body', async () => {
    await expect(fromBody('')).rejects.toThrow(/SyntaxError/);
  });
});

describe('handlePasswordCheck', () => {
  test.each([
    ['a', PasswordStrength.VeryWeak, ['lowercase']],
    ['abc123', PasswordStrength.Weak, ['lowercase', 'number']],
    ['abC12$xy', PasswordStrength.Medium, ['lowercase', 'uppercase', 'number', 'symbol']],
    ['abC12$xyzW', PasswordStrength.Strong, ['lowercase', 'uppercase', 'number', 'symbol']],
  ])('rates %j as %s', async (value, strength, contains) => {
    const result = await handlePasswordCheck(new PasswordCheckRequest(value));

    expect(result.status).toBe('success');
    expect(result.data).toEqual({
      strength,
      length: value.length,
      contains: expect.arrayContaining(contains),
    });
    expect(result.data?.contains).toHaveLength(contains.length);
  });

  test('needs four kinds of character for medium, however long', async () => {
    const result = await handlePasswordCheck(new PasswordCheckRequest('abcdefghijklmnop1'));

    expect(result.data?.strength).toBe(PasswordStrength.Weak);
  });
});
