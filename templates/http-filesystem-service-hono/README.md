# HTTP Filesystem Service with Hono in TypeScript

A WebAssembly component built with [TypeScript][ts] that serves files from a mounted directory using [Hono][hono], [jco-std][jco-std], and [`wasi:filesystem`][wasi-filesystem].

[wasi-filesystem]: https://github.com/WebAssembly/WASI/tree/main/proposals/filesystem

To bridge Hono's API and WebAssembly primitives, this component makes use of the [`@bytecodealliance/jco-std`][jco-std] adapter (which translates Hono API to [`wasi:http/incoming-handler`][wasi-http] primitives).

This project also uses [`rolldown`][rolldown] to transpile Typescript and bundle dependencies (like Hono) with our WebAssembly component code into a single `dist/component.js` build output.

[rolldown]: https://rolldown.rs/

[ts]: https://www.typescriptlang.org/
[hono]: https://hono.dev/
[wasi-http]: https://github.com/WebAssembly/WASI/tree/main/proposals/http
[jco-std]: https://github.com/bytecodealliance/jco/tree/main/packages/jco-std

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
wash new https://github.com/wasmCloud/typescript.git --name http-filesystem-service-hono --subfolder templates/http-filesystem-service-hono
```

```shell
cd http-filesystem-service-hono
```

Create a `data/` directory with some files to serve:

```shell
mkdir -p data
echo "Hello from the filesystem!" > data/hello.txt
```

To build this project and run in a hot-reloading development loop, run `npm run dev` from this directory:

```shell
npm run dev
```

### Endpoints

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/` | GET | List all files in the `/data` directory |
| `/read/:filename` | GET | Read the contents of a file |
| `/write/:filename` | POST | Write request body to a file (creates or overwrites) |

### Send requests to the running component

```shell
# List files
curl http://localhost:8000/
```

```json
{"path":"/data","entries":[{"name":"hello.txt","type":"regular-file"}]}
```

```shell
# Read a file
curl http://localhost:8000/read/hello.txt
```

```text
Hello from the filesystem!
```

```shell
# Write a new file
curl -X POST http://localhost:8000/write/greeting.txt -d "Hello, filesystem!"

# Read it back
curl http://localhost:8000/read/greeting.txt
```

```text
Hello, filesystem!
```

## Volume configuration

The `.wash/config.yaml` mounts the local `data/` directory into the component at `/data`:

```yaml
dev:
  volumes:
    - host_path: ./data
      guest_path: /data
```

Files written by the component persist on the host in the `data/` directory.

## Build Wasm binary

```bash
npm run build
```

## WIT Interfaces

This component uses the following [WIT interfaces](https://component-model.bytecodealliance.org/design/wit.html):

```wit
world typescript-http-filesystem-service-hono {
  import wasi:filesystem/types@0.2.2;
  import wasi:filesystem/preopens@0.2.2;

  export wasi:http/incoming-handler@0.2.6;
}
```

When running with `wash dev`, the host provides `wasi:filesystem` preopens automatically. The `volumes` configuration in `.wash/config.yaml` controls which host directories are mounted.
