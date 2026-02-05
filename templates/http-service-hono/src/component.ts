import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import {
  fire,
  buildLogger,
} from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
import { itemsRouter } from './routes/items.js';
import { echoRouter } from './routes/echo.js';

// Hono context variables type
type Variables = {
  requestId: string;
};

// Create the main app with typed variables
const app = new Hono<{ Variables: Variables }>();

// Build logger for WASI environment
const log = buildLogger();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Request logging
app.use('*', logger(log));

// Custom middleware: Request timing
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  c.header('X-Response-Time', `${duration}ms`);
});

// Custom middleware: Request ID tracking
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});

// ---------------------------------------------------------------------------
// Root routes
// ---------------------------------------------------------------------------

// API information
app.get('/', (c) => {
  return c.json({
    name: 'Hono HTTP Service',
    version: '1.0.0',
    description: 'A comprehensive HTTP service built with Hono on wasmCloud',
    endpoints: {
      '/': 'API information (this page)',
      '/health': 'Health check endpoint',
      '/api/items': 'RESTful items resource',
      '/api/echo': 'Echo service for testing',
      '/html': 'HTML response example',
      '/redirect': 'Redirect example',
    },
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    requestId: c.get('requestId'),
  });
});

// HTML response example
app.get('/html', (c) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Hono on wasmCloud</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #e36002; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
    .endpoint { margin: 0.5rem 0; }
  </style>
</head>
<body>
  <h1>Hono on wasmCloud</h1>
  <p>This HTML page is served by a WebAssembly component running on wasmCloud.</p>
  <h2>Available Endpoints</h2>
  <div class="endpoint"><code>GET /</code> - API information (JSON)</div>
  <div class="endpoint"><code>GET /health</code> - Health check</div>
  <div class="endpoint"><code>GET /api/items</code> - List all items</div>
  <div class="endpoint"><code>POST /api/items</code> - Create an item</div>
  <div class="endpoint"><code>GET /api/items/:id</code> - Get an item</div>
  <div class="endpoint"><code>PUT /api/items/:id</code> - Update an item</div>
  <div class="endpoint"><code>DELETE /api/items/:id</code> - Delete an item</div>
  <div class="endpoint"><code>GET /api/echo</code> - Echo query parameters</div>
  <div class="endpoint"><code>POST /api/echo</code> - Echo request body</div>
</body>
</html>`;
  return c.html(html);
});

// Redirect example
app.get('/redirect', (c) => {
  return c.redirect('/');
});

// ---------------------------------------------------------------------------
// Mount API routes
// ---------------------------------------------------------------------------

app.route('/api/items', itemsRouter);
app.route('/api/echo', echoRouter);

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

// Custom 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `The requested path '${c.req.path}' does not exist`,
      requestId: c.get('requestId'),
    },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  log.error(`Error: ${err.message}`);

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        requestId: c.get('requestId'),
      },
      err.status,
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
      requestId: c.get('requestId'),
    },
    500,
  );
});

// ---------------------------------------------------------------------------
// Fire the app with WASI HTTP adapter
// ---------------------------------------------------------------------------

fire(app);

// Export the incoming handler for jco
export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
