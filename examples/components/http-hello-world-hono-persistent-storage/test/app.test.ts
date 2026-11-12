import { beforeEach, describe, expect, test } from 'vitest';
import { app } from '../src/app.js';
import { buckets, open } from './fakes/wasi-keyvalue-store.js';

beforeEach(() => {
  buckets.clear();
});

describe('GET /', () => {
  test('greets the world by default', async () => {
    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello x1, World!\n');
  });

  test('counts each name separately', async () => {
    await app.request('/?name=Ada');
    await app.request('/?name=Ada');
    const ada = await app.request('/?name=Ada');
    const grace = await app.request('/?name=Grace');

    expect(await ada.text()).toBe('Hello x3, Ada!\n');
    expect(await grace.text()).toBe('Hello x1, Grace!\n');
  });

  test('keeps counters in the default bucket', async () => {
    await app.request('/?name=Ada');

    expect([...buckets.keys()]).toEqual(['']);
    expect(new TextDecoder().decode(open('').get('Ada'))).toBe('1');
  });

  test('treats an empty name as the world', async () => {
    await app.request('/');
    const res = await app.request('/?name=');

    expect(await res.text()).toBe('Hello x2, World!\n');
  });
});

test('unknown paths are not found', async () => {
  const res = await app.request('/nope');

  expect(res.status).toBe(404);
  expect(await res.text()).toBe('Not found\n');
});
