interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  fetchEvent.respondWith(handleRequest(fetchEvent.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/request')) {
    return await proxyRequest(request, url, 'raw');
  }

  if (path.startsWith('/json')) {
    return await proxyRequest(request, url, 'json');
  }

  if (path.startsWith('/headers')) {
    return await proxyRequest(request, url, 'headers');
  }

  return new Response(HELP_TEXT);
}

// ---------------------------------------------------------------------------
// Proxy
// ---------------------------------------------------------------------------

// Headers that should not be forwarded to the target URL
const SKIP_HEADERS = new Set(['host', 'connection', 'transfer-encoding']);

// Default target URLs by HTTP method
const DEFAULT_URLS: Record<string, string> = {
  GET: 'https://httpbin.org/get',
  POST: 'https://httpbin.org/post',
  PUT: 'https://httpbin.org/put',
  DELETE: 'https://httpbin.org/delete',
  PATCH: 'https://httpbin.org/patch',
};

// Methods that support request bodies
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

// Maximum request body size (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

type ResponseMode = 'raw' | 'json' | 'headers';

async function proxyRequest(request: Request, url: URL, mode: ResponseMode): Promise<Response> {
  const targetUrlParam = url.searchParams.get('url');
  let targetUrl: string;

  if (targetUrlParam) {
    // Validate the URL to prevent SSRF attacks
    try {
      const parsed = new URL(targetUrlParam);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return jsonResponse({ error: 'Only http and https URLs are allowed' }, 400);
      }
      targetUrl = parsed.href;
    } catch {
      return jsonResponse({ error: 'Invalid URL provided' }, 400);
    }
  } else {
    targetUrl = DEFAULT_URLS[request.method] || DEFAULT_URLS.GET;
  }

  // Forward headers, excluding those that shouldn't be proxied
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Read request body for methods that support it, with size limit
  let body: string | null = null;
  if (BODY_METHODS.has(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return jsonResponse({ error: `Request body too large (max ${MAX_BODY_SIZE} bytes)` }, 413);
    }
    body = await request.text();
    if (body.length > MAX_BODY_SIZE) {
      return jsonResponse({ error: `Request body too large (max ${MAX_BODY_SIZE} bytes)` }, 413);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    if (mode === 'headers') {
      return jsonResponse({
        url: targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headersToObject(response.headers),
      });
    }

    const responseBody = await response.text();

    if (mode === 'json') {
      try {
        const json = JSON.parse(responseBody);
        return jsonResponse(json, response.status);
      } catch {
        return jsonResponse({ error: 'Response is not valid JSON', raw: responseBody }, 500);
      }
    }

    // Raw mode
    return new Response(`Status: ${response.status}\nBody: ${responseBody}`);
  } catch (error) {
    const message = `Request failed: ${error}`;
    if (mode === 'json' || mode === 'headers') {
      return jsonResponse({ error: message }, 500);
    }
    return new Response(`Error making request: ${error}`, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

const HELP_TEXT = `HTTP Client Template

This component makes outgoing HTTP requests using the standard fetch() API.

Endpoints:
  /request  - Proxy requests and return raw response
  /json     - Proxy requests and return formatted JSON
  /headers  - Proxy requests and return response headers

Usage:
  GET    /request            - Forward GET to httpbin.org/get
  POST   /request            - Forward POST to httpbin.org/post
  PUT    /request            - Forward PUT to httpbin.org/put
  DELETE /request            - Forward DELETE to httpbin.org/delete
  PATCH  /request            - Forward PATCH to httpbin.org/patch

  Any endpoint with ?url=URL - Forward request to the specified URL

Features:
  - Custom headers are forwarded to the target URL
  - Request body is forwarded for POST, PUT, and PATCH requests
  - /json endpoint parses and formats JSON responses
  - /headers endpoint returns response headers as JSON

Examples:
  curl http://localhost:8000/request
  curl -X POST -d '{"key":"value"}' -H "Content-Type: application/json" http://localhost:8000/request
  curl http://localhost:8000/json
  curl http://localhost:8000/headers
  curl 'http://localhost:8000/headers?url=https://api.github.com'
`;
