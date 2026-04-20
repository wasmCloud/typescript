# TypeScript WebGPU TensorFlow HTTP component

This repository contains a WebAssembly component written in [TypeScript][ts], which:

- Uses [TensorFlow.js][tfjs] and the [WebGPU backend][tfjs-webgpu]
- Implements [`wasi:http`][wasi-http] for incoming HTTP requests
- Uses [`wasi:webgpu`][wasi-webgpu] and [`wasi:graphics-context`][wasi-graphics-context]
- Exposes `POST /stylize` to run neural style transfer on JPEG images
- Serves a small browser UI at `/index.html` for interactive testing

Model artifacts under `models/` are third-party files licensed under Apache-2.0.
See `models/ATTRIBUTION.md` for source and licensing details.

[ts]: https://www.typescriptlang.org/
[tfjs]: https://www.tensorflow.org/js
[tfjs-webgpu]: https://www.npmjs.com/package/@tensorflow/tfjs-backend-webgpu
[wasi-http]: https://github.com/WebAssembly/wasi-http
[wasi-webgpu]: https://github.com/WebAssembly/wasi-webgpu
[wasi-graphics-context]: https://github.com/WebAssembly/wasi-graphics-context
[wash]: https://github.com/wasmCloud/wasmCloud/tree/main/crates/wash-cli
[node]: https://nodejs.org
[npm]: https://github.com/npm/cli
[wasm-pkg-tools]: https://github.com/bytecodealliance/wasm-pkg-tools

# Dependencies

> ![WARN]
> When building this project, ensure you are using a stable NodeJS release.
>
> Use of node version management tools (ex. [`nvm`](https://github.com/nvm-sh/nvm) or more newer NVM
> compatible tools like [`fnm`](https://github.com/Schniz/fnm)) are recommended -- a `.nvmrc` file is
> included for easy use.

Building this project relies on the following installed software:

| Name   | Description                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `wash` | [Wasmcloud Shell][wash] controls your [wasmcloud][wasmcloud] host instances and enables building components |
| `npm`  | [Node Package Manager (NPM)][npm] which manages packages for for the NodeJS ecosystem                       |
| `node` | [NodeJS runtime][node] (see `.nvmrc` for version)                                                           |
| `wkg`  | (optional) [wasm-pkg-tools][wasm-pkg-tools] project that makes it easy to pull down WIT definitions         |

[wasmcloud]: https://wasmcloud.com/docs/intro

# Quickstart

## With `wash`

To build the project into a runnable WebAssembly component, you can use `wash`:

```console
wash build
```

To get into a rapid development loop, run `wash dev`:

```console
wash dev
```

`wash dev` does many things for you:

- Starts a local wasmCloud host that can run your WebAssembly component
- Builds this project (including necessary `npm` script targets)
- Deploys the component locally
- Watches your code for changes and re-deploys when necessary

## Send a request to the running component

Once `wash dev` is serving your component, send a request to the health endpoint:

```console
curl localhost:8000
```

You should receive:

```json
{"msg":"Hello World!"}
```

To try image stylization, open:

```text
http://localhost:8000/index.html
```

Then upload a content JPEG and a style JPEG and click **Stylize**.

## Adding Capabilities

To learn how to extend this example with additional capabilities, see the [Adding Capabilities](https://wasmcloud.com/docs/tour/adding-capabilities?lang=typescript) section of the wasmCloud documentation.

