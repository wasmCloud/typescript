import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('serves the app on fetch events', async () => {
  const addEventListener = vi.fn();
  vi.stubGlobal('self', { addEventListener });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);

  await import('../src/index.js');
  const { app } = await import('../src/app.js');

  expect(addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function));

  const respondWith = vi.fn();
  const listener = addEventListener.mock.calls[0][1];
  listener({ request: new Request('http://localhost/hello'), respondWith });

  const res = await respondWith.mock.calls[0][0];
  expect(await res.text()).toBe('Hello, World!');
  expect(app).toBeDefined();
});
