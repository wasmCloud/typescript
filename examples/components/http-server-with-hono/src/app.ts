import {Hono, Context} from 'hono';
import {wasiLog} from './wasmcloud/hono-middleware-wasi-logging';

// Initialize Hono app
const app = new Hono();

// Middleware for logging
app.use(wasiLog());

// Define routes
app.get('/', (c: Context) => c.text('Welcome to the Hono HTTP Router Example!'));
app.get('/hello', (c: Context) => c.text('Hello, World!'));
app.get('/api/data', (c: Context) => c.json({message: 'This is some JSON data.'}));

// handle missing routes
app.notFound((c: Context) => {
  return c.json({error: '404 Not Found'}, 404);
});

export default app;
