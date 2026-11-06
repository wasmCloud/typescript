import { vi } from 'vitest';

type FetchListener = (event: {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}) => void;

/**
 * Load the component and return its fetch handler.
 *
 * The component registers a fetch listener on the global scope when it loads,
 * so this loads a fresh copy with addEventListener stubbed and calls the
 * listener it registered.
 */
export async function loadComponent(): Promise<(request: Request) => Promise<Response>> {
  const addEventListener = vi.fn();
  vi.stubGlobal('addEventListener', addEventListener);
  vi.resetModules();
  await import('../src/component.js');
  const listener = addEventListener.mock.calls[0][1] as FetchListener;

  return async (request) => {
    let response: Response | Promise<Response> | undefined;
    listener({ request, respondWith: (r) => (response = r) });
    if (response === undefined) {
      throw new Error('the listener did not respond');
    }
    return response;
  };
}
