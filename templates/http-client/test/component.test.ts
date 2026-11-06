import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('answers fetch events with the handler response', async () => {
  // The component registers its listener on the global scope at load time.
  const addEventListener = vi.fn();
  vi.stubGlobal('addEventListener', addEventListener);
  await import('../src/component.js');

  expect(addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function));
  const listener = addEventListener.mock.calls[0][1];

  const respondWith = vi.fn();
  listener({ request: new Request('http://localhost/'), respondWith });

  expect(respondWith).toHaveBeenCalledOnce();
  const res: Response = await respondWith.mock.calls[0][0];
  expect(await res.text()).toContain('HTTP Client Template');
});
