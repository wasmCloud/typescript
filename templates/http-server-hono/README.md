# HTTP Server with Hono in TypeScript

This project template is a WebAssembly component built with [TypeScript][ts] to respond to web requests using the [Hono][hono] web framework. The component utilizes the [`wasi:http`][wasi-http] interface via the [`@bytecodealliance/jco-std`][jco-std] adapter.

[ts]: https://www.typescriptlang.org/
[hono]: https://hono.dev/
[wasi-http]: https://github.com/WebAssembly/WASI/tree/main/proposals/http
[jco-std]: https://github.com/nicholaslyang/jco-std

## Prerequisites

- [Wasm Shell (`wash`)](https://wasmcloud.com/docs/v2.0.0-rc/wash/) v2.0.0-rc.7
- [Node Package Manager (`npm`)][npm]
- [NodeJS runtime][node]

[node]: https://nodejs.org
[npm]: https://github.com/npm/cli

## Local development

To build this project and run in a hot-reloading development loop, run `wash dev` from this directory:

```shell
wash dev
```

### Send a request to the running component

Once `wash dev` is serving your component, send a request to the running component:

```shell
curl localhost:8000
```
```text
Hello from Hono on wasmCloud!
```

The component also supports JSON endpoints:

```shell
curl -X POST localhost:8000/json/post -H "Content-Type: application/json" -d '{"message": "hello"}'
```
```text
{"method":"POST","body":{"message":"hello"}}
```

```shell
curl -X DELETE localhost:8000/json/delete -H "Content-Type: application/json" -d '{"id": 123}'
```
```text
{"method":"DELETE","body":{"id":123}}
```

```shell
curl -X PATCH localhost:8000/json/patch -H "Content-Type: application/json" -d '{"field": "value"}'
```
```text
{"method":"PATCH","body":{"field":"value"}}
```

## Build Wasm binary

```bash
wash build
```

## Interfaces

This component imports and exports the following WIT interfaces:

```wit
world root {
  import wasi:io/poll@0.2.6;
  import wasi:clocks/monotonic-clock@0.2.6;
  import wasi:io/error@0.2.6;
  import wasi:io/streams@0.2.6;
  import wasi:http/types@0.2.6;
  import wasi:cli/stdin@0.2.3;
  import wasi:cli/stdout@0.2.3;
  import wasi:cli/stderr@0.2.3;
  import wasi:cli/terminal-input@0.2.3;
  import wasi:cli/terminal-output@0.2.3;
  import wasi:cli/terminal-stdin@0.2.3;
  import wasi:cli/terminal-stdout@0.2.3;
  import wasi:cli/terminal-stderr@0.2.3;
  import wasi:clocks/wall-clock@0.2.3;
  import wasi:filesystem/types@0.2.3;
  import wasi:filesystem/preopens@0.2.3;
  import wasi:random/random@0.2.3;
  import wasi:http/outgoing-handler@0.2.3;

  export wasi:http/incoming-handler@0.2.6; // <---- This export enables responding to HTTP requests
}
```
