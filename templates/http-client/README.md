# HTTP Client in TypeScript

This project template is a WebAssembly component built with JavaScript ([TypeScript][ts]) to respond to web requests received via [fetch events][fetch] with a "Hello World" message. The component utilizes the [`wasi:http`][wasi-http] interface.

[ts]: https://www.typescriptlang.org/
[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event
[wasi-http]: https://github.com/WebAssembly/WASI/tree/main/proposals/http

## Prerequisites

- [Wasm Shell (`wash`)](https://wasmcloud.com/docs/v2.0.0-rc/wash/) v2.0.0-rc.7
- [Node Package Manager (`npm`)][npm]
- [NodeJS runtime][nodejs]

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
Hello from TypeScript!
```

## Build Wasm binary

```bash
wash build
```

## Interfaces

This component imports and exports the following WIT interfaces:

```wit
world root {
  import wasi:io/poll@0.2.3;
  import wasi:clocks/monotonic-clock@0.2.3;
  import wasi:io/error@0.2.3;
  import wasi:io/streams@0.2.3;
  import wasi:http/types@0.2.3;
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
  import wasi:http/outgoing-handler@0.2.3; // <---- This import is used by `fetch()`!

  export wasi:http/incoming-handler@0.2.3; // <---- This export enables responding to HTTP requests
}
```