# TypeScript WebGPU TensorFlow service + component

A wasmCloud v2 service-and-component example written in [TypeScript][ts] that demonstrates **GPU-accelerated ML inside a wasmCloud workload** — running [TensorFlow.js][tfjs] with the [WebGPU backend][tfjs-webgpu] on top of [`wasi:webgpu`][wasi-webgpu].

The example has two parts:

| Part | Type | What it does |
|---|---|---|
| `service/` | wasmCloud **service** workload | TensorFlow.js style-transfer engine. Loads the model into GPU memory once at startup and serves a binary TCP protocol on `127.0.0.1:7878`. |
| `component/` | wasmCloud **component** workload | HTTP front-end. Serves the browser UI at `/`, forwards `POST /stylize` to the service over loopback TCP, returns the stylized JPEG. |

Model artifacts under `service/models/` are third-party files licensed under Apache-2.0.
See `service/models/ATTRIBUTION.md` for source and licensing details.

## Architecture

```
HTTP client
    │  POST /stylize  {contentImage: dataUrl, styleImage: dataUrl}
    ▼
component  (wasi:http/incoming-handler)
    │  TCP connect 127.0.0.1:7878
    │  send: u32 contentLen | content JPEG | u32 styleLen | style JPEG
    ▼
service    (wasi:cli/run, wasi:webgpu)
    │  TF.js + WebGPU style transfer
    │  send: u8 status | u32 payloadLen | stylized JPEG
    ▼
component
    ▼
HTTP client  (image/jpeg)
```

Both workloads run in the same wasmCloud host and share an in-process loopback network. Services bind to `0.0.0.0` but the runtime rewrites that to `127.0.0.1` — services are never reachable from outside the host.

## Prerequisites

- [Wasm Shell (`wash`)](https://wasmcloud.com/docs/installation) **≥ 2.1.0** — WebGPU in services landed in 2.1.0.
- Node.js ≥ 20 and npm ≥ 10
- A GPU on the host machine running `wash dev`

## Quickstart

```bash
# Install dependencies (also applies the componentize-js patch)
npm install

# Build, deploy, and watch for changes
wash dev
```

`wash dev` reads `.wash/config.yaml` and starts the host with `wasi:webgpu` enabled, deploys both `service/dist/service.wasm` and `component/dist/component.wasm`, and watches `service/src` and `component/src` for rebuilds.

Once it's up, open the UI:

```text
http://localhost:8000/
```

Pick a content image and a style image and click **Stylize**.

## How it works

The thing this example demonstrates is GPU-accelerated ML running as a long-lived wasmCloud workload. The component imports `wasi:http`; the service imports `wasi:webgpu` and exports `wasi:cli/run`. The runtime wires `wasi:webgpu` up to the real GPU on the host running `wash dev`.

### Roles

- **Service** ([service/](service/)) — exports `wasi:cli/run`. Started once by the host at deploy and runs continuously. Owns the GPU device, the loaded TF.js models, and the WGSL shader cache. Listens on TCP `127.0.0.1:7878` for stylize requests.
- **Component** ([component/](component/)) — exports `wasi:http/incoming-handler`. Stateless. Each HTTP request gets a fresh invocation. Serves the UI, validates the request body, opens a TCP connection to the service, forwards the JPEGs, returns the stylized result.
- **Loopback TCP between them** — both workloads run inside the same wasmCloud host and share an in-process network. The service binds to `0.0.0.0` but the runtime rewrites that to `127.0.0.1`, so the connection never leaves the host.

### Warmup

`Stylizer.initialize()` in [service/src/image-stylizer.ts](service/src/image-stylizer.ts) runs three things at service startup, all paid once:

1. Loads model topology and weights from in-memory base64 data URLs (weights are bundled into `service.wasm` at build time).
2. Calls `tf.setBackend("webgpu")` and `tf.ready()` to spin up the WebGPU device.
3. Runs a dummy `predict()` against zero tensors at the model's expected input shapes. This forces TF.js to compile every WGSL shader and JIT-cache every kernel up front — without it, the *first real request* would pay that ~17s cost and likely time out.

After warmup the service logs `[stylize-service] ready in <N>ms`. Subsequent inferences run in the tens of milliseconds because the GPU context, compiled shaders, and model weights all stay resident in the long-lived service process.

### The plumbing

- **`wasi_webgpu: true`** in [`.wash/config.yaml`](.wash/config.yaml) tells `wash dev` to start the host with its `wasi:webgpu` runtime enabled. Without it, the service would fail to instantiate.
- **`service_file:`** in the same config tells the host to run `service/dist/service.wasm` as a service workload alongside the HTTP component.
- **[`@wasi-gfx/js-webgpu`](https://www.npmjs.com/package/@wasi-gfx/js-webgpu)** installs a `globalThis.navigator.gpu` shim that forwards browser-style WebGPU calls to the `wasi:webgpu` host import, so TensorFlow.js's WebGPU backend "just works".
- **Model weights are bundled** into `service.wasm` at build time as base64 data URLs. The service is fully self-contained at runtime — no filesystem or network fetch needed.
- **The model loads once.** Service workloads run continuously and hold state between connections, so the GPU context and the loaded TF model stay warm across requests.

## Project structure

```
webgpu-tensorflow/
├── .wash/config.yaml         # wash project config (wasi_webgpu, service_file)
├── patches/                  # patch-package fixes for componentize-js
├── package.json              # npm workspace root
│
├── service/                  # TF/WebGPU style-transfer engine
│   ├── .wash/config.yaml     # subpackage anchor for wash wit commands
│   ├── src/service.ts        # wasi:cli/run TCP server
│   ├── src/image-stylizer.ts # TensorFlow.js + WebGPU model code
│   ├── models/               # bundled model weights (~52 MB)
│   ├── polyfill.js           # Math.random shim, navigator.gpu placeholder
│   ├── wit/world.wit         # imports wasi:webgpu + sockets, exports wasi:cli/run
│   └── wit/deps.toml         # wit-deps config (webgpu WITs are not on OCI)
│
└── component/                # HTTP front-end
    ├── .wash/config.yaml     # subpackage anchor for wash wit commands
    ├── src/component.ts      # Hono app + TCP client + static UI
    ├── src/static/           # HTML, CSS, JS, sample JPEGs
    └── wit/world.wit         # imports sockets, exports wasi:http
```

## Build internals

### npm workspaces

The root `package.json` defines two npm workspaces (`service` and `component`). `npm run build` orchestrates both.

### Patched componentize-js

Building `wasi:sockets` components requires a fix to `@bytecodealliance/componentize-js`. The spidermonkey-embedding-splicer does not generate a JavaScript class for WIT resource types declared in method-less interfaces (such as `wasi:sockets/network`). Without the class, `instanceNetwork()` and socket operations throw a `ReferenceError` at runtime.

The patch at `patches/@bytecodealliance+componentize-js+0.20.0.patch` injects the missing class definitions. It runs automatically via `patch-package` during `npm install`.

Each subpackage's `scripts/componentize.js` calls `@bytecodealliance/componentize-js` directly (rather than via `jco componentize`) to ensure the patched top-level version is used.

### `.wash/config.yaml` anchors

The root `.wash/config.yaml` tells `wash dev` how to build, where to find the built component, and which file to load as a service. The `.wash/config.yaml` files in `service/` and `component/` anchor those directories as project roots for `wash wit` commands, which traverse up the directory tree to find their target.

### Node polyfills (`unenv`)

TensorFlow.js was written for the browser and Node, so it pulls in things like `node:util/types`, `node:buffer`, `node:process`, etc. SpiderMonkey-in-wasm has none of those. The service rollup config wires up [`unenv`](https://github.com/unjs/unenv) to provide stub implementations, plus a hand-written [service/node-util-types-polyfill.js](service/node-util-types-polyfill.js) for `node:util/types` (which `unenv` doesn't yet ship — see [unjs/unenv#540](https://github.com/unjs/unenv/pull/540)). Without these, the service won't even load.

### TF.js / wasi:webgpu compatibility shim

[service/src/image-stylizer.ts](service/src/image-stylizer.ts) wraps `GPUAdapter.prototype.requestDevice` to coerce `requiredFeatures` entries to strings before forwarding the call. TF.js currently passes feature names that aren't quite the strings `wasi:webgpu` expects ([tensorflow/tfjs#8639](https://github.com/tensorflow/tfjs/pull/8639)). Once the upstream PR lands, the override can go.

## Known limitations

A few rough edges to be aware of:

- **`Math.random` is currently constant.** [service/polyfill.js](service/polyfill.js) overrides `globalThis.Math.random` to always return `0.5` as a temporary shim until `wizer` initializes `wasi:random` (support is coming soon upstream). Anything that depends on randomness will be deterministic in unexpected ways in the meantime.
- **The service uses `wit-deps` instead of `wash wit fetch`.** The component uses the standard `wash wit fetch` flow, but the service falls back to [`wit-deps`](https://github.com/bytecodealliance/wit-deps) because the WebGPU-related WITs aren't yet published to OCI. Once they are, the service should switch over too.
- **The resulting `service.wasm` is large.** TensorFlow.js, its WebGPU backend, the bundled WGSL shaders, the unenv Node polyfills, and ~52 MB of model weights all get statically linked, so the output is much larger than a typical wasm component — expect tens of MB rather than the usual hundreds of KB.

## Customizing

### Change the inference logic

Edit [`service/src/image-stylizer.ts`](service/src/image-stylizer.ts). The `Stylizer` class loads two models and exposes `stylize()` — adjust either to swap the model, change preprocessing, or tune output quality.

### Add HTTP routes

Edit [`component/src/component.ts`](component/src/component.ts). Add routes to the Hono app using the standard Hono API. The `callStylizeService()` helper encapsulates the TCP client logic; extend it or add new helpers that connect to the service for additional inference endpoints.

### Change the TCP port

The port is `const PORT = 7878` in [`service/src/service.ts`](service/src/service.ts). Update `SERVICE_PORT` in [`component/src/component.ts`](component/src/component.ts) to match.

## Adding Capabilities

To learn how to extend this example with additional capabilities, see the [Adding Capabilities](https://wasmcloud.com/docs/tour/adding-capabilities?lang=typescript) section of the wasmCloud documentation.

[ts]: https://www.typescriptlang.org/
[tfjs]: https://www.tensorflow.org/js
[tfjs-webgpu]: https://www.npmjs.com/package/@tensorflow/tfjs-backend-webgpu
[wasi-webgpu]: https://github.com/WebAssembly/wasi-gfx
