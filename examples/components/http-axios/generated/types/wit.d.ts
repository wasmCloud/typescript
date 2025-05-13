/// <reference path="./interfaces/wasi-cli-run.d.ts" />
/// <reference path="./interfaces/wasmcloud-examples-invoke.d.ts" />
declare module 'wasmcloud:examples/component' {
  export * as invoke from 'wasmcloud:examples/invoke'; // export wasmcloud:examples/invoke
  export * as run from 'wasi:cli/run@0.2.3'; // export wasi:cli/run@0.2.3
}
