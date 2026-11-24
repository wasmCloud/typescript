import { describe, expect, test } from 'vitest';
import { app } from '../src/app.js';

describe('routes', () => {
  test('GET / says hello', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(await res.text()).toBe('Hello from TypeScript!\n');
  });

  test('unknown paths return a plain-text 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found\n');
  });

  test('other methods on / return 404', async () => {
    const res = await app.request('/', { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
