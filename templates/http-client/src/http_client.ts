interface FetchEvent extends Event {
  respondWith(response: Promise<Response> | Response): void;
  request: Request;
}

addEventListener('fetch', (event) =>
  (event as FetchEvent).respondWith(
    (async () => {
      return new Response('Hello from TypeScript!\n');
    })(),
  ),
);
