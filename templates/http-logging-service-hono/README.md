# HTTP Logging Service with Hono in TypeScript

This project template is a WebAssembly component built with [TypeScript][ts] that demonstrates structured logging via [`wasi:logging`][wasi-logging] in a [Hono][hono] HTTP service running on wasmCloud.

Every request and response is logged at the appropriate level (`trace`, `debug`, `info`, `warn`, `error`, `critical`) so you can see exactly how WASI logging integrates with the wasmCloud host's structured log output.

[ts]: https://www.typescriptlang.org/
[hono]: https://hono.dev/
[wasi-logging]: https://github.com/WebAssembly/wasi-logging
[wasi-http]: https://github.com/WebAssembly/WASI/tree/main/proposals/http
[jco-std]: https://github.com/bytecodealliance/jco/tree/main/packages/jco-std
[rolldown]: https://rolldown.rs/

## Prerequisites

- [Wasm Shell (`wash`)][wash]
- [Node Package Manager (`npm`)][npm]
- [Node.js runtime][node]

[wash]: https://wasmcloud.com/docs/installation
[node]: https://nodejs.org
[npm]: https://github.com/npm/cli

## Local development

Use `wash new` to scaffold a new project from this template:

```shell
wash new https://github.com/wasmCloud/typescript.git --name http-logging-service-hono --subfolder templates/http-logging-service-hono
cd http-logging-service-hono
```

Start the hot-reloading development loop:

```shell
wash dev
```

> **Note:** `npm run dev` runs `wash dev` through nodemon, which detaches it from the terminal TTY and strips ANSI colors from the log output. Run `wash dev` directly to keep colors.

### Try it out

```console
curl localhost:8000
```

#### What the logging looks like

```
INFO  --> GET /health requestId=412297c9 context="http"
TRACE health check requestId=412297c9  context="routes"
INFO  <-- GET /health 200 1ms requestId=412297c9  context="http"

WARN  --> GET /missing requestId=e1bf36e2 context="http"
WARN  404: /missing requestId=e1bf36e2  context="router"
WARN  <-- GET /missing 404 0ms requestId=e1bf36e2 context="http"
```

## Endpoints

| Endpoint  | Method | Description                               |
| --------- | ------ | ----------------------------------------- |
| `/`       | GET    | API information                           |
| `/health` | GET    | Health check with timestamp and requestId |

### Log levels used

| Level      | Where                                        |
| ---------- | -------------------------------------------- |
| `trace`    | `/health` handler (high-frequency, low-value)|
| `debug`    | Full request headers, error stack traces     |
| `info`     | Every request `-->` and successful `<--`     |
| `warn`     | 4xx responses, slow responses (>200ms), 404s |
| `error`    | 5xx responses                                |
| `critical` | Unhandled errors that escape all handlers    |

## WIT Interfaces

```wit
world typescript-http-logging-service-hono {
  import wasi:logging/logging@0.1.0-draft;

  export wasi:http/incoming-handler@0.2.6;
}
```

## Build Wasm binary

```bash
npm run build
```
