import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { serve } from '../../src/wasmcloud/hono-adapter/index.js';

type FetchListener = (event: {
  request: Request;
  respondWith: (r: Promise<Response>) => void;
}) => void;

let log: ReturnType<typeof vi.spyOn>;
let listeners: FetchListener[];

beforeEach(() => {
  listeners = [];
  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: FetchListener) => {
      if (type === 'fetch') {
        listeners.push(listener);
      }
    },
  });
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Dispatches a fetch event the way StarlingMonkey would.
async function dispatch(request: Request): Promise<Response> {
  let response: Promise<Response> | undefined;
  listeners[0]({ request, respondWith: (r) => (response = r) });
  if (!response) {
    throw new Error('the listener did not respond');
  }
  return response;
}

describe('serve()', () => {
  test('registers one fetch listener that answers with the app', async () => {
    const app = new Hono();
    app.get('/', (c) => c.text('ok'));

    serve(app);

    expect(listeners).toHaveLength(1);
    const res = await dispatch(new Request('http://localhost/'));
    expect(await res.text()).toBe('ok');
  });

  test('logs each request URL', async () => {
    serve(new Hono());

    await dispatch(new Request('http://localhost/path'));

    expect(log).toHaveBeenCalledWith('[DEBUG] serve(): Request: http://localhost/path');
  });
});

describe('error handling', () => {
  function failingApp(err: unknown) {
    const app = new Hono();
    app.get('/', () => {
      throw err;
    });
    serve(app);
    return app;
  }

  test('returns the response of an HTTPException', async () => {
    failingApp(new HTTPException(418, { message: 'teapot' }));

    const res = await dispatch(new Request('http://localhost/'));

    expect(res.status).toBe(418);
    expect(await res.text()).toBe('teapot');
  });

  test('answers JSON to JSON requests', async () => {
    failingApp(new Error('boom'));

    const res = await dispatch(
      new Request('http://localhost/', { headers: { 'Content-Type': 'application/json' } }),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });

  test('answers text to other requests', async () => {
    failingApp(new Error('boom'));

    const res = await dispatch(new Request('http://localhost/'));

    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
  });

  test('logs the error', async () => {
    failingApp(new Error('boom'));

    await dispatch(new Request('http://localhost/'));

    expect(log).toHaveBeenCalledWith(
      '[ERROR] http-server-with-hono:hono-adapter:handleError(): Error: Error: boom',
    );
  });
});
