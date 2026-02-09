# HTTP Client in TypeScript

This project template is a WebAssembly component built with [TypeScript][ts] that demonstrates making outgoing HTTP requests using the standard [fetch() API][fetch-api].

It uses the [Service Worker fetch event][fetch-event] pattern for handling incoming requests.

This component serves as a proxy -- receiving a request which tells it *which* outgoing request to make.

[ts]: https://www.typescriptlang.org/
[fetch-api]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[fetch-event]: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event

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
wash new https://github.com/wasmCloud/typescript.git --name http-client --subfolder templates/http-client
```

```shell
cd http-client
```

To build this project and run in a hot-reloading development loop, run `npm run dev` from this directory:

```shell
npm run dev
```

## Endpoints

| Endpoint | Description |
| -------- | ----------- |
| `/request` | Proxy requests and return raw response with status |
| `/json` | Proxy requests and return formatted JSON |
| `/headers` | Proxy requests and return response headers |

All endpoints support the `?url=URL` query parameter to specify a custom target URL.

## Features

### 1. Multiple HTTP Methods

Supports GET, POST, PUT, DELETE, and PATCH methods:

```shell
curl http://localhost:8000/request
curl -X POST http://localhost:8000/request
curl -X PUT http://localhost:8000/request
curl -X DELETE http://localhost:8000/request
```

### 2. Custom Headers

Headers from the incoming request are forwarded to the target:

```shell
curl -H "Authorization: Bearer token123" http://localhost:8000/request
curl -H "X-Custom-Header: my-value" http://localhost:8000/request
```

### 3. Request Body

Request bodies are forwarded for POST, PUT, and PATCH requests:

```shell
curl -X POST -d '{"name":"test"}' -H "Content-Type: application/json" http://localhost:8000/request
```

### 4. JSON Handling

The `/json` endpoint parses and formats JSON responses:

```shell
curl http://localhost:8000/json
curl -X POST -d '{"message":"hello"}' -H "Content-Type: application/json" http://localhost:8000/json
```

### 5. Response Headers

The `/headers` endpoint returns response headers as JSON:

```shell
curl http://localhost:8000/headers
curl http://localhost:8000/headers?url=https://api.github.com
```

## Build Wasm binary

```bash
npm run build
```

## WIT Interfaces

This component imports and exports the following [WIT interfaces](https://component-model.bytecodealliance.org/design/wit.html):

```wit
world typescript-http-client {
  import wasi:http/outgoing-handler@0.2.3;
  export wasi:http/incoming-handler@0.2.3;
}
```
