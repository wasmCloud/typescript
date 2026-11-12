import { expect, test } from 'vitest';
import { app } from '../src/app.js';

test('GET / welcomes the caller', async () => {
  const res = await app.request('/');

  expect(res.status).toBe(200);
  expect(await res.text()).toBe('Welcome to the Hono HTTP Router Example!');
});

test('GET /hello greets the world', async () => {
  const res = await app.request('/hello');

  expect(await res.text()).toBe('Hello, World!');
});

test('GET /api/data returns JSON', async () => {
  const res = await app.request('/api/data');

  expect(res.headers.get('Content-Type')).toMatch(/^application\/json/);
  expect(await res.json()).toEqual({ message: 'This is some JSON data.' });
});

test('GET /api/config returns the config', async () => {
  const res = await app.request('/api/config');

  expect(await res.json()).toEqual({
    theme: 'dark',
    version: '1.0.0',
    features: ['logging', 'metrics'],
  });
});

test('unknown routes answer a JSON 404', async () => {
  const res = await app.request('/nope');

  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: '404 Not Found' });
});

test('routes only answer GET', async () => {
  const res = await app.request('/hello', { method: 'POST' });

  expect(res.status).toBe(404);
});
