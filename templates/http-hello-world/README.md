# HTTP Hello World in TypeScript

A minimal WebAssembly component built with [TypeScript][ts] that responds to HTTP requests using the [Service Worker Fetch API][fetch-event] pattern.

[ts]: https://www.typescriptlang.org/
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
wash new https://github.com/wasmCloud/typescript.git --name http-hello-world --subfolder templates/http-hello-world
```

```shell
cd http-hello-world
```

To build this project and run in a hot-reloading development loop, run `npm run dev` from this directory:

```shell
npm run dev
```

### Send a request to the running component

Once `wash dev` is serving your component, send a request:

```shell
curl localhost:8000
```

```text
Hello from TypeScript!
```

## Build Wasm binary

```bash
npm run build
```

## Interfaces

This component exports the following WIT interface:

```wit
world typescript-http-hello-world {
  export wasi:http/incoming-handler@0.2.3;
}
```
