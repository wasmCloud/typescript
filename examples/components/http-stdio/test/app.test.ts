import { beforeEach, describe, expect, test } from 'vitest';
import { app } from '../src/app.js';
import { stdout } from './fakes/wasi-cli-stdout.js';
import { stderr } from './fakes/wasi-cli-stderr.js';

beforeEach(() => {
  stdout.chunks.length = 0;
  stderr.chunks.length = 0;
});

describe('/', () => {
  test('greets the caller and logs to stdout', async () => {
    const res = await app.request('/?name=Ada');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello Ada!\n');
    expect(stdout.text()).toBe('Ada called\n');
    expect(stderr.text()).toBe('');
  });

  test('answers any method', async () => {
    const res = await app.request('/?name=Grace', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello Grace!\n');
  });

  test('rejects a missing name and logs to stderr', async () => {
    const res = await app.request('/');

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Please pass ?name=<your name> so that we can greet you\n');
    expect(stderr.text()).toBe('missing ?name param\n');
    expect(stdout.text()).toBe('');
  });

  test('treats an empty name as missing', async () => {
    const res = await app.request('/?name=');

    expect(res.status).toBe(400);
    expect(stderr.text()).toBe('missing ?name param\n');
  });
});

test('other paths are not found', async () => {
  const res = await app.request('/other?name=Ada');

  expect(res.status).toBe(404);
  expect(stdout.text()).toBe('');
});
