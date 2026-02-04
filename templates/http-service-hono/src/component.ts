import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import {
  fire,
  buildLogger,
} from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';

// Types
interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Hono context variables type
type Variables = {
  requestId: string;
};

// Simulated database
const items = new Map<string, Item>();
let nextId = 1;

// Initialize with sample data
items.set('1', {
  id: '1',
  name: 'Sample Item',
  description: 'This is a sample item',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
nextId = 2;

// Create the main app with typed variables
const app = new Hono<{ Variables: Variables }>();

// Build logger for WASI environment
const log = buildLogger();

// ============================================================================
// Middleware
// ============================================================================

// Request logging
app.use('*', logger(log));

// CORS middleware - allow all origins for demo purposes
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Response-Time', 'X-Request-Id'],
    maxAge: 86400,
  }),
);

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

// ============================================================================
// Root routes
// ============================================================================

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
  <h1>🔥 Hono on wasmCloud</h1>
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

// ============================================================================
// API Routes: Items (RESTful CRUD)
// ============================================================================

const api = new Hono<{ Variables: Variables }>();

// List all items
api.get('/items', (c) => {
  const itemList = Array.from(items.values());

  // Support filtering by name via query parameter
  const nameFilter = c.req.query('name');
  const filtered = nameFilter
    ? itemList.filter((item) => item.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : itemList;

  // Support pagination via query parameters
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const paginated = filtered.slice(offset, offset + limit);

  return c.json({
    items: paginated,
    total: filtered.length,
    limit,
    offset,
  });
});

// Get single item by ID
api.get('/items/:id', (c) => {
  const id = c.req.param('id');
  const item = items.get(id);

  if (!item) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  return c.json(item);
});

// Create new item
api.post('/items', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string }>();

  // Validation
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    throw new HTTPException(400, { message: 'Name is required and must be a non-empty string' });
  }

  const id = String(nextId++);
  const now = new Date().toISOString();

  const newItem: Item = {
    id,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  items.set(id, newItem);

  c.status(201);
  c.header('Location', `/api/items/${id}`);
  return c.json(newItem);
});

// Update item
api.put('/items/:id', async (c) => {
  const id = c.req.param('id');
  const existing = items.get(id);

  if (!existing) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  const body = await c.req.json<{ name?: string; description?: string }>();

  // Validation
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
    throw new HTTPException(400, { message: 'Name must be a non-empty string' });
  }

  const updated: Item = {
    ...existing,
    name: body.name?.trim() ?? existing.name,
    description: body.description?.trim() ?? existing.description,
    updatedAt: new Date().toISOString(),
  };

  items.set(id, updated);

  return c.json(updated);
});

// Delete item
api.delete('/items/:id', (c) => {
  const id = c.req.param('id');

  if (!items.has(id)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  items.delete(id);

  return c.json({ deleted: true, id });
});

// ============================================================================
// API Routes: Echo (for testing)
// ============================================================================

// Echo query parameters
api.get('/echo', (c) => {
  const queries: Record<string, string> = {};
  const url = new URL(c.req.url);
  url.searchParams.forEach((value, key) => {
    queries[key] = value;
  });

  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return c.json({
    method: c.req.method,
    path: c.req.path,
    queries,
    headers,
    requestId: c.get('requestId'),
  });
});

// Echo request body
api.post('/echo', async (c) => {
  const contentType = c.req.header('Content-Type') || '';

  let body: unknown;
  if (contentType.includes('application/json')) {
    body = await c.req.json();
  } else if (contentType.includes('text/')) {
    body = await c.req.text();
  } else {
    body = await c.req.text();
  }

  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return c.json({
    method: c.req.method,
    path: c.req.path,
    contentType,
    body,
    headers,
    requestId: c.get('requestId'),
  });
});

// Mount API routes under /api prefix
app.route('/api', api);

// ============================================================================
// Error Handling
// ============================================================================

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

// ============================================================================
// Fire the app with WASI HTTP adapter
// ============================================================================

fire(app);

// Export the incoming handler for jco
export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
