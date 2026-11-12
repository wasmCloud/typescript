import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello from TypeScript!\n');
});

app.notFound((c) => {
  return c.text('Not found\n', 404);
});

export { app };
