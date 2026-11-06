import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadComponent } from './load-component.js';

// Outgoing requests go through the global fetch, which the host provides
// over wasi:http/outgoing-handler. Tests replace it with a mock upstream.
const fetchMock = vi.fn<typeof fetch>();
let handleRequest: (request: Request) => Promise<Response>;

beforeEach(async () => {
  handleRequest = await loadComponent();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200, statusText: 'OK' }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function call(path: string, init?: RequestInit): Promise<Response> {
  return handleRequest(new Request(`http://localhost:8000${path}`, init));
}

function forwarded(): { url: string; init: RequestInit } {
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0];
  return { url: url as string, init: init as RequestInit };
}

describe('help', () => {
  test('unknown paths return the help text without fetching', async () => {
    const res = await call('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('HTTP Client Template');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('target URL', () => {
  test.each([
    ['GET', 'https://httpbin.org/get'],
    ['POST', 'https://httpbin.org/post'],
    ['PUT', 'https://httpbin.org/put'],
    ['DELETE', 'https://httpbin.org/delete'],
    ['PATCH', 'https://httpbin.org/patch'],
  ])('%s defaults to %s', async (method, url) => {
    await call('/request', { method, body: ['GET', 'DELETE'].includes(method) ? null : 'x' });
    expect(forwarded().url).toBe(url);
    expect(forwarded().init.method).toBe(method);
  });

  test('methods without a default fall back to the GET URL', async () => {
    await call('/request', { method: 'OPTIONS' });
    expect(forwarded().url).toBe('https://httpbin.org/get');
  });

  test('?url= overrides the target', async () => {
    await call('/request?url=http://example.com/path');
    expect(forwarded().url).toBe('http://example.com/path');
  });

  test('rejects non-http protocols', async () => {
    const res = await call('/json?url=file:///etc/passwd');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Only http and https URLs are allowed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects an unparseable URL', async () => {
    const res = await call('/headers?url=not-a-url');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid URL provided' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('forwarding', () => {
  test('forwards custom headers but not hop-by-hop ones', async () => {
    await call('/request', { headers: { 'X-Custom': 'yes', Host: 'localhost:8000' } });
    const headers = forwarded().init.headers as Headers;
    expect(headers.get('x-custom')).toBe('yes');
    expect(headers.has('host')).toBe(false);
  });

  test('forwards the body for POST', async () => {
    await call('/request', { method: 'POST', body: '{"key":"value"}' });
    expect(forwarded().init.body).toBe('{"key":"value"}');
  });

  test('sends no body for GET', async () => {
    await call('/request');
    expect(forwarded().init.body).toBeNull();
  });

  test('rejects a declared content-length over 1MB', async () => {
    const res = await call('/request', {
      method: 'POST',
      headers: { 'Content-Length': String(1024 * 1024 + 1) },
      body: 'small',
    });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain('Request body too large');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects an actual body over 1MB', async () => {
    const res = await call('/request', { method: 'PUT', body: 'x'.repeat(1024 * 1024 + 1) });
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('/request (raw mode)', () => {
  test('returns the upstream status and body as text', async () => {
    fetchMock.mockResolvedValue(new Response('upstream body', { status: 201 }));
    const res = await call('/request');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Status: 201\nBody: upstream body');
  });

  test('reports a failed fetch as a 500 text response', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));
    const res = await call('/request');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Error making request: Error: connection refused');
  });
});

describe('/json', () => {
  test('re-serialises the upstream JSON with its status', async () => {
    fetchMock.mockResolvedValue(new Response('{"a":1}', { status: 404 }));
    const res = await call('/json');
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(await res.text()).toBe('{\n  "a": 1\n}');
  });

  test('reports a non-JSON upstream body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>'));
    const res = await call('/json');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Response is not valid JSON', raw: '<html>' });
  });

  test('reports a failed fetch as a 500 JSON response', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    const res = await call('/json');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Request failed: Error: timeout' });
  });
});

describe('/headers', () => {
  test('returns the upstream status and headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 204, statusText: 'No Content', headers: { 'X-Up': '1' } }),
    );
    const res = await call('/headers?url=https://api.github.com');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: 'https://api.github.com/',
      status: 204,
      statusText: 'No Content',
      headers: { 'x-up': '1' },
    });
  });

  test('reports a failed fetch as a 500 JSON response', async () => {
    fetchMock.mockRejectedValue('boom');
    const res = await call('/headers');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Request failed: boom' });
  });
});
