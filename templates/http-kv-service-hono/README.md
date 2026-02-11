# HTTP + Key-Value Service with Hono in TypeScript

This project template is a WebAssembly component built with [TypeScript][ts] that demonstrates a comprehensive HTTP service using the [Hono][hono] web framework, with persistent storage backed by [`wasi:keyvalue`][wasi-kv].

[wasi-kv]: https://github.com/WebAssembly/wasi-keyvalue

To bridge Hono's API and WebAssembly primitives, this component makes use of the [`@bytecodealliance/jco-std`][jco-std] adapter (which translates Hono API to [`wasi:http/incoming-handler`][wasi-http] primitives).

This project also uses [`rolldown`][rolldown] to transpile Typescript and bundle dependencies (like Hono) with our WebAssembly component code into a single `dist/component.js` build output.

[rolldown]: https://rolldown.rs/

[ts]: https://www.typescriptlang.org/
[hono]: https://hono.dev/
[wasi-http]: https://github.com/WebAssembly/WASI/tree/main/proposals/http
[jco-std]: https://github.com/bytecodealliance/jco/tree/main/packages/jco-std

## Prerequisites

- [Wasm Shell (`wash`)][wash]
- [Node Package Manager (`npm`)][npm]
- [Node.js runtime][node]

[wash]: https://wasmcloud.com/docs/installation
[node]: https://nodejs.org
[npm]: https://github.com/npm/cli

## Local development

Use `wash new` to scaffold a new wasmCloud component project:

```shell
wash new https://github.com/wasmCloud/typescript.git --name http-kv-service-hono --subfolder templates/http-kv-service-hono --git-ref v2
```

```shell
cd http-service-hono
```

To build this project and run in a hot-reloading development loop, run `npm run dev` from this directory:

```shell
npm run dev
```

## Endpoints

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/` | GET | API information and available endpoints |
| `/health` | GET | Health check with timestamp and request ID |
| `/html` | GET | HTML response example |
| `/redirect` | GET | Redirect example (redirects to `/`) |
| `/api/items` | GET | List all items (supports filtering and pagination) |
| `/api/items` | POST | Create a new item |
| `/api/items/:id` | GET | Get a single item by ID |
| `/api/items/:id` | PUT | Update an item |
| `/api/items/:id` | DELETE | Delete an item |
| `/api/echo` | GET | Echo query parameters and headers |
| `/api/echo` | POST | Echo request body |

## Features

### Middleware

The service demonstrates several Hono middleware patterns:

- **Request logging** - All requests are logged with timing information
- **Response timing** - `X-Response-Time` header added to all responses
- **Request ID tracking** - Unique `X-Request-Id` header for request tracing

### RESTful CRUD API

```shell
# List all items (with optional filtering and pagination)
curl http://localhost:8000/api/items
curl 'http://localhost:8000/api/items?name=sample'
curl 'http://localhost:8000/api/items?limit=5&offset=0'

# Get a single item
curl http://localhost:8000/api/items/1

# Create a new item
curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"New Item","description":"Item description"}'

# Update an item
curl -X PUT http://localhost:8000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete an item
curl -X DELETE http://localhost:8000/api/items/1
```

### Echo Endpoints

Useful for testing and debugging:

```shell
# Echo query parameters and headers
curl 'http://localhost:8000/api/echo?foo=bar&test=123'

# Echo POST body
curl -X POST http://localhost:8000/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

### Error Handling

The service includes comprehensive error handling:

- **HTTPException** for structured error responses
- **Custom 404 handler** with helpful error messages
- **Global error handler** for unexpected errors

## Build Wasm binary

```bash
npm run build
```

## WIT Interfaces

This component uses the following [WIT interfaces](https://component-model.bytecodealliance.org/design/wit.html):

```wit
world typescript-http-kv-service-hono {
  import wasi:keyvalue/store@0.2.0-draft;
  import wasi:keyvalue/atomics@0.2.0-draft;

  export wasi:http/incoming-handler@0.2.6;
}
```

When running with `wash dev`, a NATS-KV keyvalue provider is automatically provisioned to fulfill the `wasi:keyvalue` imports.

