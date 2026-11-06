import { beforeEach, describe, expect, test, vi } from 'vitest';

// The items store lives in the module, so each test loads a fresh copy.
let app: typeof import('../src/app.js').app;

beforeEach(async () => {
  vi.resetModules();
  ({ app } = await import('../src/app.js'));
});

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

describe('root routes', () => {
  test('GET / describes the API', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Hono HTTP Handler');
    expect(body.endpoints).toHaveProperty('/api/items');
  });

  test('GET /health reports healthy with the request ID', async () => {
    const res = await app.request('/health', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'healthy', requestId: 'abc-123' });
  });

  test('GET /html serves an HTML page', async () => {
    const res = await app.request('/html');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(await res.text()).toContain('<h1>Hono on wasmCloud</h1>');
  });

  test('GET /redirect redirects to /', async () => {
    const res = await app.request('/redirect');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
  });
});

describe('middleware', () => {
  test('generates a request ID when none is sent', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('echoes the request ID it was sent', async () => {
    const res = await app.request('/health', { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.headers.get('X-Request-Id')).toBe('abc-123');
  });

  test.each([
    ['too long', 'a'.repeat(129)],
    ['with a space', 'a b'],
    ['with markup', '<script>'],
    ['with a separator', 'a;b'],
  ])('replaces a request ID %s with a new one', async (_name, id) => {
    const res = await app.request('/health', { headers: { 'X-Request-Id': id } });
    expect(res.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(await res.json()).not.toMatchObject({ requestId: id });
  });

  test('reports the response time', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);
  });
});

describe('errors', () => {
  test('unknown paths return a JSON 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: 'Not Found',
      message: "The requested path '/nope' does not exist",
    });
  });

  test('unexpected errors return a JSON 500', async () => {
    app.get('/boom', () => {
      throw new Error('boom');
    });
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: 'Internal Server Error', message: 'boom' });
  });
});

describe('/api/items', () => {
  test('lists the sample item', async () => {
    const res = await app.request('/api/items');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      items: [{ id: '1', name: 'Sample Item' }],
      total: 1,
      limit: 10,
      offset: 0,
    });
  });

  test('filters by name, ignoring case', async () => {
    await app.request('/api/items', json('POST', { name: 'Widget' }));
    const res = await app.request('/api/items?name=WIDG');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].name).toBe('Widget');
  });

  test('paginates with limit and offset', async () => {
    await app.request('/api/items', json('POST', { name: 'Second' }));
    const res = await app.request('/api/items?limit=1&offset=1');
    expect(await res.json()).toMatchObject({
      items: [{ name: 'Second' }],
      total: 2,
      limit: 1,
      offset: 1,
    });
  });

  test('gets an item by ID', async () => {
    const res = await app.request('/api/items/1');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: '1', name: 'Sample Item' });
  });

  test.each([
    ['limit=0', "'limit' must be an integer from 1 to 100"],
    ['limit=101', "'limit' must be an integer from 1 to 100"],
    ['limit=abc', "'limit' must be an integer from 1 to 100"],
    ['limit=1.5', "'limit' must be an integer from 1 to 100"],
    ['offset=-1', "'offset' must be an integer from 0 to"],
  ])('rejects ?%s', async (query, message) => {
    const res = await app.request(`/api/items?${query}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(message);
  });

  test('treats empty pagination parameters as absent', async () => {
    const res = await app.request('/api/items?limit=&offset=');
    expect(await res.json()).toMatchObject({ limit: 10, offset: 0 });
  });

  test.each(['POST /api/items', 'PUT /api/items/1'])(
    '%s rejects a malformed JSON body',
    async (route) => {
      const [method, path] = route.split(' ');
      const res = await app.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'Request body must be valid JSON' });
    },
  );

  test('returns 404 for a missing item', async () => {
    const res = await app.request('/api/items/99');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Item with id '99' not found" });
  });

  test('creates an item, trimming its fields', async () => {
    const res = await app.request(
      '/api/items',
      json('POST', { name: '  Widget  ', description: ' A widget ' }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get('Location')).toBe('/api/items/2');
    expect(await res.json()).toMatchObject({ id: '2', name: 'Widget', description: 'A widget' });
  });

  test('creates an item with an empty description by default', async () => {
    const res = await app.request('/api/items', json('POST', { name: 'Widget' }));
    expect(await res.json()).toMatchObject({ description: '' });
  });

  test('rejects an item without a name', async () => {
    const res = await app.request('/api/items', json('POST', { description: 'nameless' }));
    expect(res.status).toBe(400);
  });

  test('rejects an item with an empty name', async () => {
    const res = await app.request('/api/items', json('POST', { name: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: 'Name is required and must be a non-empty string',
    });
  });

  test('updates an item', async () => {
    const res = await app.request('/api/items/1', json('PUT', { name: 'Renamed' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: '1',
      name: 'Renamed',
      description: 'This is a sample item',
    });
  });

  test('updates only the description', async () => {
    const res = await app.request('/api/items/1', json('PUT', { description: 'New' }));
    expect(await res.json()).toMatchObject({ name: 'Sample Item', description: 'New' });
  });

  test('rejects an update with an empty name', async () => {
    const res = await app.request('/api/items/1', json('PUT', { name: '' }));
    expect(res.status).toBe(400);
  });

  test('returns 404 when updating a missing item', async () => {
    const res = await app.request('/api/items/99', json('PUT', { name: 'x' }));
    expect(res.status).toBe(404);
  });

  test('deletes an item', async () => {
    const res = await app.request('/api/items/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true, id: '1' });
    expect((await app.request('/api/items/1')).status).toBe(404);
  });

  test('returns 404 when deleting a missing item', async () => {
    const res = await app.request('/api/items/99', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('/api/echo', () => {
  test('GET echoes the query and headers', async () => {
    const res = await app.request('/api/echo?a=1&b=two', { headers: { 'X-Test': 'yes' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ method: 'GET', path: '/api/echo', queries: { a: '1', b: 'two' } });
    expect(body.headers).toMatchObject({ 'x-test': 'yes' });
  });

  test('POST echoes a JSON body', async () => {
    const res = await app.request('/api/echo', json('POST', { hello: 'world' }));
    expect(await res.json()).toMatchObject({
      method: 'POST',
      contentType: 'application/json',
      body: { hello: 'world' },
    });
  });

  test('POST echoes a text body', async () => {
    const res = await app.request('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });
    expect(await res.json()).toMatchObject({ contentType: 'text/plain', body: 'hello' });
  });

  test('POST rejects a malformed JSON body', async () => {
    const res = await app.request('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  test('POST without a content type echoes the body as text', async () => {
    const res = await app.request('/api/echo', { method: 'POST', body: 'raw' });
    expect(await res.json()).toMatchObject({ body: 'raw' });
  });
});
