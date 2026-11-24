import { Hono } from 'hono';
import { afterEach, expect, test, vi } from 'vitest';
import { wasiLog } from '../../src/wasmcloud/hono-middleware-wasi-logging/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

test('logs each request and its response status', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const app = new Hono();
  app.use('*', wasiLog());
  app.get('/hello', (c) => c.text('hi'));

  const res = await app.request('/hello', { method: 'GET' });

  expect(res.status).toBe(200);
  const lines = log.mock.calls.map(([line]) => line as string);
  expect(lines[0]).toBe(
    '[INFO] http-server-with-hono:hono-middleware-logging:middleware: <-- GET /hello',
  );
  expect(lines[1]).toMatch(
    /^\[INFO\] http-server-with-hono:hono-middleware-logging:middleware: --> GET \/hello 200 \d+ms$/,
  );
});
