# service-tcp-echo

A wasmCloud v2 service-and-component template written in TypeScript that demonstrates the **wasmCloud service model** with `wasi:sockets`.

The template has two parts:

| Part | Type | What it does |
|---|---|---|
| `service/` | wasmCloud **service** workload | TCP server — accepts connections on `127.0.0.1:7878`, reads lines, replies with the word count |
| `component/` | wasmCloud **component** workload | HTTP API — `POST /count` forwards text to the TCP service and returns a JSON word count |

## Architecture

```
HTTP client
    │  POST /count  {body: "hello world"}
    ▼
component (wasi:http/incoming-handler)
    │  TCP connect 127.0.0.1:7878
    │  send "hello world\n"
    ▼
service  (wasi:cli/run)
    │  count words → 2
    │  send "2\n"
    ▼
component
    │  { "text": "hello world", "count": 2 }
    ▼
HTTP client
```

Both workloads run in the same wasmCloud host process and communicate over an **in-process loopback network**. Services bind to `0.0.0.0` but the runtime rewrites that to `127.0.0.1` (loopback only — services are never reachable from outside the host).

## Prerequisites

- [Wasm Shell (`wash`)](https://wasmcloud.com/docs/installation)
- Node.js ≥ 20 and npm ≥ 10

## Quick start

```bash
# Install dependencies (applies the componentize-js patch)
npm install

# Start the development server (builds, deploys, watches for changes)
wash dev
```

The HTTP API is available at `http://localhost:8000`.

```bash
# Count words in a string
curl -X POST -d "the quick brown fox" http://localhost:8000/count
# => { "text": "the quick brown fox", "count": 4 }

# Check the service info
curl http://localhost:8000/
```

## Project structure

```
service-tcp-echo/
├── .wash/config.yaml        # wash project config (build + dev commands)
├── nodemon.json             # dev file-watch config
├── patches/                 # patch-package fixes (see Build internals)
├── package.json             # npm workspace root
│
├── service/                 # TCP word-count server
│   ├── .wash/config.yaml    # subpackage project anchor for wash wit commands
│   ├── src/service.ts       # wasi:cli/run service implementation
│   ├── wit/world.wit        # WIT world (imports wasi:sockets, exports wasi:cli/run)
│   └── package.json
│
└── component/               # HTTP front-end
    ├── .wash/config.yaml    # subpackage project anchor for wash wit commands
    ├── src/component.ts     # Hono app — POST /count → TCP service → JSON response
    ├── wit/world.wit        # WIT world (imports wasi:sockets, exports wasi:http/incoming-handler)
    └── package.json
```

## wasmCloud v2 service model

The `service/` workload is a **service** — a long-running process that exports `wasi:cli/run`. The runtime calls `run.run()` once on startup and expects it to block indefinitely in a server loop.

Services can bind TCP sockets to loopback (`127.0.0.1`). The runtime enforces this: any `0.0.0.0` bind is silently rewritten to `127.0.0.1`. Components on the same host can connect to those loopback addresses. External callers cannot.

The `component/` workload is a standard **HTTP component** that exports `wasi:http/incoming-handler`. It connects to the service over loopback TCP on every request.

See the [wasmCloud v2 services documentation](https://wasmcloud.com/docs/v2.0.0-rc/overview/workloads/services/).

## Build internals

### npm workspaces

The root `package.json` defines two npm workspaces (`service` and `component`). Running any script from the root orchestrates both:

```bash
npm run build          # builds service.wasm and component.wasm
npm run setup:wit      # fetches WIT deps and generates TypeScript types
```

### Patched componentize-js

Building wasi:sockets components requires a fix to `@bytecodealliance/componentize-js`. The spidermonkey-embedding-splicer does not generate a JavaScript class for WIT resource types declared in method-less interfaces (such as `wasi:sockets/network`). Without the class, `instanceNetwork()` and socket operations throw a `ReferenceError` at runtime.

The patch at `patches/@bytecodealliance+componentize-js+0.19.4-rc.1.patch` injects the missing class definitions after scanning for finalization registries that have no matching class. It runs automatically via `patch-package` during `npm install`.

Each subpackage's `scripts/componentize.mjs` calls `@bytecodealliance/componentize-js` directly (rather than via `jco componentize`) to ensure the patched top-level version is used.

### `.wash/config.yaml` anchors

The root `.wash/config.yaml` tells `wash dev` how to build and where to find the built wasm files. However, `wash wit fetch` (used during setup) traverses up the directory tree to find the project root. Without per-subpackage anchors, it would resolve the project root to `service-tcp-echo/` and fail to find the subpackage `wit/` directory.

The `.wash/config.yaml` files in `service/` and `component/` anchor those directories as project roots for `wash wit` commands.

## Customizing

### Change what the service computes

Edit `service/src/service.ts` → `handleConnection()`. The protocol is line-oriented: the client sends a line terminated with `\n`; the service replies with a line. Restart `wash dev` or save the file (nodemon will rebuild automatically).

### Add HTTP routes

Edit `component/src/component.ts`. Add routes to the Hono app using the standard Hono API. The `queryWordCount()` helper encapsulates the TCP client logic; you can extend it or add your own helpers that connect to the service.

### Change the TCP port

The port is defined as `const PORT = 7878` in `service/src/service.ts`. Update the matching `SERVICE_PORT` constant in `component/src/component.ts` to the same value.
