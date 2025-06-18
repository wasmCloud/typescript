import {Hono, Context} from 'hono';

import {serve, type WasiEnv} from './wasmcloud/hono-adapter';
import {wasiLog} from './wasmcloud/hono-middleware-wasi-logging';

// Initialize Hono app
const app = new Hono<WasiEnv>();

// Middleware for logging
app.use(wasiLog());

// Define routes
app.get('/', (c: Context) => c.text('Welcome to the Hono HTTP Router Example!'));
app.get('/hello', (c: Context) => c.text('Hello, World!'));
app.get('/api/data', (c: Context) => c.json({message: 'This is some JSON data.'}));
app.get('/api/config', (c: Context) => {
  try {
    const config = JSON.parse(c.env.public_config_json);
    return c.json(config);
  } catch (error) {
    return c.json({error: 'Failed to parse config JSON'}, 500);
  }
});

// handle missing routes
app.notFound((c: Context) => {
  return c.json({error: '404 Not Found'}, 404);
});

serve(app);
