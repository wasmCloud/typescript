import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { app } from '../src/app.js';
import { values } from './fakes/wasi-config-store.js';

beforeEach(() => {
  values.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('GET / lists the routes', async () => {
  const res = await app.request('/');

  expect(res.status).toBe(200);
  const body = await res.text();
  expect(body).toContain('wasi-config-from-k8s-env example');
  expect(body).toContain('GET /config/:key');
});

describe('GET /config', () => {
  test('returns every config value', async () => {
    values.set('greeting', 'hello');
    values.set('LOG_LEVEL', 'debug');

    const res = await app.request('/config');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ greeting: 'hello', LOG_LEVEL: 'debug' });
  });

  test('returns an empty object without config', async () => {
    const res = await app.request('/config');

    expect(await res.json()).toEqual({});
  });
});

describe('GET /config/:key', () => {
  test('returns a single value', async () => {
    values.set('greeting', 'hello');
    values.set('other', 'ignored');

    const res = await app.request('/config/greeting');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ greeting: 'hello' });
  });

  test('answers 404 when the store reports a missing key as null', async () => {
    vi.spyOn(values, 'get').mockReturnValueOnce(null as unknown as string);

    const res = await app.request('/config/missing');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "config key 'missing' not found" });
  });

  // The generated binding returns `undefined` for a missing key (option<string>),
  // but the handler only checks for `null`, so it answers 200 with an empty object.
  test('answers 200 with an empty object for a missing key (documents current behaviour)', async () => {
    const res = await app.request('/config/missing');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });
});

test('unknown paths are not found', async () => {
  const res = await app.request('/nope');

  expect(res.status).toBe(404);
});
