import {Hono, Context} from 'hono';

import {serve, type WasiEnv} from './wasmcloud/hono-adapter';

// Initialize Hono app
const app = new Hono<WasiEnv>();

// Define routes
app.get('/', (c: Context) => c.text('Welcome to the Hono HTTP Router Example!'));
app.get('/hello', (c: Context) => c.text('Hello, World!'));
app.get('/api/data', (c: Context) => c.json({message: 'This is some JSON data.'}));
app.get('/api/config', (c: Context) => {
  return c.json({theme: 'dark', version: '1.0.0', features: ['logging', 'metrics']});
});

// handle missing routes
app.notFound((c: Context) => {
  return c.json({error: '404 Not Found'}, 404);
});

serve(app);
