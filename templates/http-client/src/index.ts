interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

addEventListener('fetch', (event) =>
  (event as FetchEvent).respondWith(handleRequest((event as FetchEvent).request)),
);

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/request')) {
    return handleProxyRequest(request, url, 'raw');
  }

  if (path.startsWith('/json')) {
    return handleProxyRequest(request, url, 'json');
  }

  if (path.startsWith('/headers')) {
    return handleProxyRequest(request, url, 'headers');
  }

  // Default response with usage information
  return new Response(`HTTP Client Template

This component makes outgoing HTTP requests.

Endpoints:
  /request  - Proxy requests and return raw response
  /json     - Proxy requests and return formatted JSON
  /headers  - Proxy requests and return response headers

Usage:
  GET    /request            - Send GET request to httpbin.org/get
  POST   /request            - Send POST request to httpbin.org/post
  PUT    /request            - Send PUT request to httpbin.org/put
  DELETE /request            - Send DELETE request to httpbin.org/delete
  PATCH  /request            - Send PATCH request to httpbin.org/patch

  GET    /json               - Send GET request and return parsed JSON
  POST   /json               - Send POST request and return parsed JSON

  GET    /headers            - Send GET request and return response headers

  Any endpoint with ?url=URL - Send request to the specified URL

Features:
  - Custom headers are forwarded to the target URL
  - Request body is forwarded for POST, PUT, and PATCH requests
  - /json endpoint returns formatted JSON with proper Content-Type
  - /headers endpoint shows all response headers

Examples:
  curl http://localhost:8000/request
  curl -X POST -d '{"key":"value"}' -H "Content-Type: application/json" http://localhost:8000/request
  curl http://localhost:8000/json
  curl http://localhost:8000/headers
  curl 'http://localhost:8000/headers?url=https://api.github.com'
`);
}

type ResponseMode = 'raw' | 'json' | 'headers';

async function handleProxyRequest(
  request: Request,
  url: URL,
  mode: ResponseMode,
): Promise<Response> {
  // Use method-appropriate default URLs for httpbin
  const defaultUrls: Record<string, string> = {
    GET: 'https://httpbin.org/get',
    POST: 'https://httpbin.org/post',
    PUT: 'https://httpbin.org/put',
    DELETE: 'https://httpbin.org/delete',
    PATCH: 'https://httpbin.org/patch',
  };

  const targetUrl = url.searchParams.get('url') || defaultUrls[request.method] || defaultUrls.GET;

  // Forward selected headers from the incoming request
  // Skip headers that shouldn't be forwarded (host, connection, etc.)
  const skipHeaders = ['host', 'connection', 'transfer-encoding'];
  const outgoingHeaders = new Headers();

  request.headers.forEach((value, key) => {
    if (!skipHeaders.includes(key.toLowerCase())) {
      outgoingHeaders.set(key, value);
    }
  });

  // Read the request body for methods that support it
  let body: string | null = null;
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    body = await request.text();
  }

  try {
    // Forward the request method, headers, and body to the target URL
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: outgoingHeaders,
      body: body,
    });

    // Headers mode - return response headers as JSON
    if (mode === 'headers') {
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      const result = {
        url: targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headersObj,
      };

      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const responseBody = await response.text();

    // JSON mode - parse and format JSON response
    if (mode === 'json') {
      try {
        const json = JSON.parse(responseBody);
        return new Response(JSON.stringify(json, null, 2), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: 'Response is not valid JSON', raw: responseBody }, null, 2),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // Raw mode - return status and body as text
    return new Response(`Status: ${response.status}\nBody: ${responseBody}`);
  } catch (e) {
    const errorResponse = { error: `Request failed: ${e}` };
    if (mode === 'json' || mode === 'headers') {
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(`Error making request: ${e}`, { status: 500 });
  }
}
