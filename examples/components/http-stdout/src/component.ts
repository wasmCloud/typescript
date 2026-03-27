import { Hono } from 'hono';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
// @ts-expect-error — types generated after running npm run setup:wit
import { getStdout } from 'wasi:cli/stdout@0.2.0';
// @ts-expect-error — types generated after running npm run setup:wit
import { getStderr } from 'wasi:cli/stderr@0.2.0';

const encoder = new TextEncoder();

const app = new Hono();

app.all('/', (c) => {
  const name = c.req.query('name');

  if (!name) {
    // low-level stderr (equivalent to console.error)
    getStderr().blockingWriteAndFlush(encoder.encode("missing ?name param\n"));
    return c.text('Please pass ?name=<your name> so that we can greet you\n', 400);
  }

  // low-level stdout (equivalent to console.log)
  getStdout().blockingWriteAndFlush(encoder.encode(`${name} called\n`));
  return c.text(`Hello ${name}!\n`);
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
