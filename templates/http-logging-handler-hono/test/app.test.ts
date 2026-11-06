import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';

// Hono can't add routes once it has served a request, and some tests add
// routes that throw. Each test loads a fresh app, and the logging fake with it.
let app: typeof import('../src/app.js').app;
let entries: typeof import('./fakes/wasi-logging-logging.js').entries;

beforeEach(async () => {
  vi.resetModules();
  ({ app } = await import('../src/app.js'));
  ({ entries } = await import('./fakes/wasi-logging-logging.js'));
});

afterEach(() => {
  vi.useRealTimers();
});

function logged(context: string) {
  return entries.filter((e) => e.context === context);
}

describe('routes', () => {
  test('GET / describes the API', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: 'HTTP Logging Handler',
      endpoints: { '/': 'API info', '/health': 'Health check' },
    });
  });

  test('GET /health reports healthy and logs a trace', async () => {
    const res = await app.request('/health', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'healthy', requestId: 'abc-123' });
    expect(logged('routes')).toEqual([
      { level: 'trace', context: 'routes', message: 'health check requestId=abc-123' },
    ]);
  });
});

describe('request logging middleware', () => {
  test('logs the request, its headers and the response', async () => {
    const res = await app.request('/', { headers: { 'X-Request-Id': 'abc-123', 'X-Test': 'yes' } });
    expect(res.headers.get('X-Request-Id')).toBe('abc-123');
    expect(res.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);

    const http = logged('http');
    expect(http).toHaveLength(3);
    expect(http[0]).toEqual({
      level: 'info',
      context: 'http',
      message: '--> GET / requestId=abc-123',
    });
    expect(http[1].level).toBe('debug');
    expect(JSON.parse(http[1].message.replace(/^headers: /, ''))).toMatchObject({
      'x-test': 'yes',
    });
    expect(http[2].level).toBe('info');
    expect(http[2].message).toMatch(/^<-- GET \/ 200 \d+ms requestId=abc-123$/);
  });

  test('generates a request ID when none is sent', async () => {
    const res = await app.request('/');
    const id = res.headers.get('X-Request-Id');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(logged('http')[0].message).toBe(`--> GET / requestId=${id}`);
  });

  test.each([
    ['too long', 'a'.repeat(129)],
    ['with a space', 'a b'],
    ['with a separator', 'a;b'],
  ])('replaces a request ID %s with a new one', async (_name, id) => {
    const res = await app.request('/', { headers: { 'X-Request-Id': id } });
    const sent = res.headers.get('X-Request-Id');
    expect(sent).toMatch(/^[0-9a-f-]{36}$/);
    expect(logged('http')[0].message).toBe(`--> GET / requestId=${sent}`);
  });

  test('never logs credential headers', async () => {
    await app.request('/', {
      headers: {
        Authorization: 'Bearer secret-token',
        'Proxy-Authorization': 'Basic c2VjcmV0',
        Cookie: 'session=secret',
        'X-Test': 'yes',
      },
    });
    const message = logged('http')[1].message;
    expect(message).not.toContain('secret');
    expect(JSON.parse(message.replace(/^headers: /, ''))).toMatchObject({
      authorization: '[redacted]',
      'proxy-authorization': '[redacted]',
      cookie: '[redacted]',
      'x-test': 'yes',
    });
  });

  test('logs 4xx responses as warnings', async () => {
    await app.request('/nope');
    expect(logged('http').at(-1)).toMatchObject({ level: 'warn' });
    expect(logged('http').at(-1)?.message).toMatch(/^<-- GET \/nope 404 /);
  });

  test('logs 5xx responses as errors', async () => {
    app.get('/test/boom', () => {
      throw new Error('boom');
    });
    await app.request('/test/boom');
    expect(logged('http').at(-1)).toMatchObject({ level: 'error' });
  });

  test('warns about slow responses', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    app.get('/test/slow', (c) => {
      vi.advanceTimersByTime(250);
      return c.text('done');
    });
    const res = await app.request('/test/slow');
    expect(res.headers.get('X-Response-Time')).toBe('250ms');
    expect(logged('http').at(-1)).toEqual({
      level: 'warn',
      context: 'http',
      message: 'slow response: GET /test/slow took 250ms',
    });
  });

  test('does not warn about fast responses', async () => {
    await app.request('/');
    expect(logged('http').some((e) => e.message.startsWith('slow response'))).toBe(false);
  });
});

describe('errors', () => {
  test('unknown paths return a JSON 404 and log a warning', async () => {
    const res = await app.request('/nope', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found', path: '/nope', requestId: 'abc-123' });
    expect(logged('router')).toEqual([
      { level: 'warn', context: 'router', message: '404: /nope requestId=abc-123' },
    ]);
  });

  test('HTTP exceptions keep their status and log a warning', async () => {
    app.get('/test/forbidden', () => {
      throw new HTTPException(403, { message: 'Forbidden' });
    });
    const res = await app.request('/test/forbidden', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden', requestId: 'abc-123' });
    expect(logged('error')).toEqual([
      { level: 'warn', context: 'error', message: '403 Forbidden requestId=abc-123' },
    ]);
  });

  test('unexpected errors return a JSON 500 and log the stack', async () => {
    app.get('/test/crash', () => {
      throw new Error('kaboom');
    });
    const res = await app.request('/test/crash', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Internal Server Error',
      message: 'kaboom',
      requestId: 'abc-123',
    });
    const [critical, debug] = logged('error');
    expect(critical).toEqual({
      level: 'critical',
      context: 'error',
      message: 'unhandled: kaboom requestId=abc-123',
    });
    expect(debug.level).toBe('debug');
    expect(debug.message).toMatch(/^stack: Error: kaboom/);
  });

  test('logs a placeholder when an error has no stack', async () => {
    app.get('/test/stackless', () => {
      const err = new Error('no stack');
      err.stack = undefined;
      throw err;
    });
    await app.request('/test/stackless');
    expect(logged('error').at(-1)?.message).toBe('stack: unavailable');
  });
});
