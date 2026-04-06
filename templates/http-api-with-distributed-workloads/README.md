# http-api-with-distributed-workloads

A wasmCloud template demonstrating HTTP API with distributed workloads via
[`wasmcloud:messaging`][messaging]. Two WebAssembly components communicate
through the messaging interface: one dispatches tasks, the other processes them.

[messaging]: https://github.com/wasmCloud/wasmCloud/tree/main/wit/messaging

| Part | Type | What it does |
|---|---|---|
| `http-api/` | wasmCloud **component** | HTTP API — `POST /task` dispatches work via `wasmcloud:messaging/consumer` and returns the reply |
| `task-worker/` | wasmCloud **component** | Task processor — exports `wasmcloud:messaging/handler`, converts payloads to leet speak |

## Architecture

```
HTTP client
    │  POST /task { worker, payload }
    ▼
http-api component          (exports wasi:http/incoming-handler)
    │  consumer::request("tasks.task-worker", body, 5000ms)
    ▼
wasmCloud runtime
    │  routes to task-worker handler
    ▼
task-worker component        (exports wasmcloud:messaging/handler)
    │  toLeetSpeak(payload) → reply
    ▼
http-api component          returns reply body to HTTP client
```

During development with `wash dev`, the wasmCloud runtime routes calls between
components in-process — no NATS server required. In production, the runtime's
built-in messaging plugin connects to NATS automatically when the host starts
with a NATS URL (`wash host --data-nats-url nats://...`). No separate provider
deployment is needed.

## Prerequisites

- [Wasm Shell (`wash`)][wash]
- [Node Package Manager (`npm`)][npm]
- [Node.js runtime][node]

[wash]: https://wasmcloud.com/docs/installation
[node]: https://nodejs.org
[npm]: https://github.com/npm/cli

## Quick start

Use `wash new` to scaffold a new project:

```shell
wash new https://github.com/wasmCloud/typescript.git \
  --name http-api-with-distributed-workloads \
  --subfolder templates/http-api-with-distributed-workloads
```

```shell
cd http-api-with-distributed-workloads
```

Install dependencies and start the development server:

```shell
npm install
```
```shell
wash dev
```

Then open http://localhost:8000 to use the web UI, or test with curl:

```shell
curl -s -X POST http://localhost:8000/task \
  -H 'Content-Type: application/json' \
  -d '{"worker": "task-worker", "payload": "Hello World"}'
# => H3110 W0r1d
```

## Project structure

```
.
├── .wash/config.yaml          # wash build & dev configuration
├── nodemon.json               # file-watch config for `npm run dev`
├── package.json               # npm workspace root
│
├── http-api/                  # HTTP front-end component
│   ├── src/component.ts       # Hono app + messaging consumer usage
│   ├── wit/world.wit          # imports consumer, exports http/incoming-handler
│   └── ...
│
└── task-worker/               # Leet-speak task worker component
    ├── src/component.ts       # messaging handler export + leet-speak logic
    ├── wit/world.wit          # imports consumer, exports messaging/handler
    └── ...
```

## wasmcloud:messaging

This template demonstrates both sides of the `wasmcloud:messaging` interface:

| Interface | Direction | Purpose |
|---|---|---|
| `wasmcloud:messaging/consumer` | import | Send messages (`request`, `publish`) |
| `wasmcloud:messaging/handler` | export | Receive messages (`handleMessage`) |

Both components import `consumer` — `http-api` to dispatch tasks via `request()`,
`task-worker` to publish replies via `publish()`. Only `task-worker` exports `handler`.

The `rolldown.config.mjs` in each component must extend the externals pattern to cover
`wasmcloud:` imports in addition to the default `wasi:`:

```js
external: [/wasi:.*/, /wasmcloud:.*/],
```

## Build Wasm binary

```bash
npm run build
```

Artifacts:
- `http-api/dist/http_api.wasm`
- `task-worker/dist/task_worker.wasm`

## WIT interfaces

```wit
// http-api/wit/world.wit
world typescript-http-api-with-distributed-workloads-api {
  import wasmcloud:messaging/consumer@0.2.0;
  export wasi:http/incoming-handler@0.2.6;
}
```

```wit
// task-worker/wit/world.wit
world typescript-http-api-with-distributed-workloads-worker {
  import wasmcloud:messaging/consumer@0.2.0;
  export wasmcloud:messaging/handler@0.2.0;
}
```

## Production deployment

Both components run on the same wasmCloud host. Deploy both components together using a `WorkloadDeployment` manifest:

```yaml
apiVersion: runtime.wasmcloud.dev/v1alpha1
kind: WorkloadDeployment
metadata:
  name: http-api-with-distributed-workloads
spec:
  replicas: 1
  template:
    spec:
      hostInterfaces:
        - namespace: wasi
          package: http
          interfaces:
            - incoming-handler
          config:
            host: your-domain.example.com    # HTTP Host header used for routing
        - namespace: wasmcloud
          package: messaging
          interfaces:
            - consumer
            - handler
          config:
            subscriptions: "tasks.>"         # NATS subjects the task-worker subscribes to
      components:
        - name: http-api
          image: <registry>/http_api:latest
        - name: task-worker
          image: <registry>/task_worker:latest
```

The `hostInterfaces` block declares which built-in capabilities the workload needs.
No separate HTTP server or NATS messaging component is required; both are provided
by the runtime. Subscriptions are comma-separated NATS subject patterns; `tasks.>`
matches any subject starting with `tasks.`.

For Kubernetes deployment, see the
[runtime-operator documentation](https://github.com/wasmCloud/wasmCloud/tree/main/runtime-operator).
