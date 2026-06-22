# `http-hello-world-hono-persistent-storage`

The TypeScript Hono component as it stands at the end of the [wasmcloud.com
quickstart's "Add persistent storage"][quickstart-persistent-storage] step: the
`templates/http-hello-world-hono` starting point plus `wasi:keyvalue` imports in
`wit/world.wit` and the per-name counter in `src/component.ts`.

It exists as a build-tested checkpoint of that quickstart step. If a future
template change drifts from what the docs walk users through, this example's
build (run by the standard examples CI workflow) catches it.

[quickstart-persistent-storage]: https://wasmcloud.com/docs/quickstart/develop-a-webassembly-component#add-persistent-storage

## Run it

```shell
npm install
wash dev
```

```shell
curl 'http://localhost:8000/?name=Bailey'
# Hello x1, Bailey!
curl 'http://localhost:8000/?name=Bailey'
# Hello x2, Bailey!
```

The counter is persisted via `wasi:keyvalue/store` and `wasi:keyvalue/atomics` —
`wash dev` provides an in-memory implementation automatically.

## Build

```shell
npm install && npm run build
```

## WIT

```wit
world typescript-http-hello-world-hono {
  import wasi:keyvalue/store@0.2.0-draft;
  import wasi:keyvalue/atomics@0.2.0-draft;

  export wasi:http/incoming-handler@0.2.6;
}
```
