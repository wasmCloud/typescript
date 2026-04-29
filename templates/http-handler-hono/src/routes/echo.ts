import { Hono } from 'hono';

// Helper to convert Headers to a plain object
function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

type Variables = {
  requestId: string;
};

const echoRouter = new Hono<{ Variables: Variables }>();

// Echo query parameters
echoRouter.get('/', (c) => {
  const queries: Record<string, string> = {};
  new URL(c.req.url).searchParams.forEach((value, key) => {
    queries[key] = value;
  });

  return c.json({
    method: c.req.method,
    path: c.req.path,
    queries,
    headers: headersToObject(c.req.raw.headers),
    requestId: c.get('requestId'),
  });
});

// Echo request body
echoRouter.post('/', async (c) => {
  const contentType = c.req.header('Content-Type') || '';

  // Parse body based on content type
  const body = contentType.includes('application/json')
    ? await c.req.json()
    : await c.req.text();

  return c.json({
    method: c.req.method,
    path: c.req.path,
    contentType,
    body,
    headers: headersToObject(c.req.raw.headers),
    requestId: c.get('requestId'),
  });
});

export { echoRouter };
