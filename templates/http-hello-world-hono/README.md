# HTTP Hello World with Hono in TypeScript

A minimal WebAssembly component built with [TypeScript][ts] that responds to HTTP requests using [Hono][hono] and [jco-std][jco-std].

[ts]: https://www.typescriptlang.org/
[hono]: https://hono.dev/
[jco-std]: https://github.com/nicoburniske/jco-std

## Prerequisites

- [Wasm Shell (`wash`)][wash]
- [Node Package Manager (`npm`)][npm]
- [Node.js runtime][node]

[wash]: https://wasmcloud.com/docs/installation
[node]: https://nodejs.org
[npm]: https://github.com/npm/cli

## Local development

Install dependencies:

```shell
npm install
```

To build this project and run in a hot-reloading development loop, run `npm run dev` from this directory:

```shell
npm run dev
```

### Send a request to the running component

Once `npm run dev` is serving your component, send a request:

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

## WIT Interfaces

This component exports the following [WIT interfaces](https://component-model.bytecodealliance.org/design/wit.html):

```wit
world typescript-http-hello-world-hono {
  export wasi:http/incoming-handler@0.2.6;
}
```
