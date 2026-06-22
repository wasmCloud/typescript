import { Hono } from 'hono';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';

import { increment } from 'wasi:keyvalue/atomics@0.2.0-draft';
import { open } from 'wasi:keyvalue/store@0.2.0-draft';

const app = new Hono();

app.get('/', (c) => {
  const name = c.req.query('name') || 'World';
  const bucket = open('');
  const count = increment(bucket, name, 1);
  return c.text(`Hello x${count}, ${name}!\n`);
});

app.notFound((c) => {
  return c.text('Not found\n', 404);
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
