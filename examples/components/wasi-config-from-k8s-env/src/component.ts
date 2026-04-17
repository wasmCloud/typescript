import { Hono } from 'hono';
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
import { get, getAll } from 'wasi:config/store@0.2.0-rc.1';

const app = new Hono();

app.get('/', (c) => {
  return c.text(
    'wasi-config-from-k8s-env example\n\n' +
    'Routes:\n' +
    '  GET /config        — list all config values\n' +
    '  GET /config/:key   — get a specific config value\n',
  );
});

// Returns all config values as JSON.
// In Kubernetes, wasmCloud can source these from a ConfigMap or Secret
// by linking a config provider to this component.
app.get('/config', (c) => {
  const config = Object.fromEntries(getAll());
  return c.json(config);
});

// Returns a single config value by key.
app.get('/config/:key', (c) => {
  const key = c.req.param('key');
  const value: string | null = get(key);
  if (value === null) {
    return c.json({ error: `config key '${key}' not found` }, 404);
  }
  return c.json({ [key]: value });
});

fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
