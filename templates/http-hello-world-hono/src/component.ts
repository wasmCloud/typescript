import { Hono } from 'hono';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello from TypeScript!\n');
});

app.notFound((c) => {
  return c.text('Not found\n', 404);
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
