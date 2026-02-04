interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

addEventListener('fetch', (event) =>
  (event as FetchEvent).respondWith(
    (async () => {
      return new Response('Hello from TypeScript!\n');
    })(),
  ),
);
