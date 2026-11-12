import { expect, test, vi } from 'vitest';

const fire = vi.fn();

vi.mock(
  '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server',
  async (importOriginal) => ({
    ...(await importOriginal()),
    fire,
  }),
);

test('serves the app through the WASI HTTP adapter', async () => {
  const component = await import('../src/component.js');
  const { app } = await import('../src/app.js');

  expect(fire).toHaveBeenCalledWith(app);
  expect(component.incomingHandler).toBeDefined();
});
