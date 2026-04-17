import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
import { log } from 'wasi:logging/logging@0.1.0-draft';

type Variables = {
  requestId: string;
  startTime: number;
};

const app = new Hono<{ Variables: Variables }>();

// Attach a request ID and timestamp, then log every request/response
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.set('startTime', Date.now());
  c.header('X-Request-Id', requestId);

  const { method, path } = c.req;
  log('info', 'http', `--> ${method} ${path} requestId=${requestId}`);
  log('debug', 'http', `headers: ${JSON.stringify(Object.fromEntries(c.req.raw.headers))}`);

  await next();

  const status = c.res.status;
  const duration = Date.now() - c.get('startTime');
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  log(level, 'http', `<-- ${method} ${path} ${status} ${duration}ms requestId=${requestId}`);

  if (duration > 200) {
    log('warn', 'http', `slow response: ${method} ${path} took ${duration}ms`);
  }

  c.header('X-Response-Time', `${duration}ms`);
});

app.get('/', (c) =>
  c.json({
    name: 'HTTP Logging Service',
    version: '1.0.0',
    description: 'A Hono service on wasmCloud demonstrating WASI structured logging',
    endpoints: { '/': 'API info', '/health': 'Health check' },
  }),
);

app.get('/health', (c) => {
  log('trace', 'routes', `health check requestId=${c.get('requestId')}`);
  return c.json({ status: 'healthy', timestamp: new Date().toISOString(), requestId: c.get('requestId') });
});

app.notFound((c) => {
  log('warn', 'router', `404: ${c.req.path} requestId=${c.get('requestId')}`);
  return c.json({ error: 'Not Found', path: c.req.path, requestId: c.get('requestId') }, 404);
});

app.onError((err, c) => {
  const requestId = c.get('requestId');
  if (err instanceof HTTPException) {
    log('warn', 'error', `${err.status} ${err.message} requestId=${requestId}`);
    return c.json({ error: err.message, requestId }, err.status);
  }
  log('critical', 'error', `unhandled: ${err.message} requestId=${requestId}`);
  log('debug', 'error', `stack: ${err.stack ?? 'unavailable'}`);
  return c.json({ error: 'Internal Server Error', message: err.message, requestId }, 500);
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
