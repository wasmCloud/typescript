/// <reference path="./interfaces/wasi-clocks-monotonic-clock.d.ts" />
/// <reference path="./interfaces/wasi-http-incoming-handler.d.ts" />
/// <reference path="./interfaces/wasi-http-types.d.ts" />
/// <reference path="./interfaces/wasi-io-error.d.ts" />
/// <reference path="./interfaces/wasi-io-poll.d.ts" />
/// <reference path="./interfaces/wasi-io-streams.d.ts" />
declare module 'wasmcloud:http-password-checker/component' {
  export type * as WasiClocksMonotonicClock022 from 'wasi:clocks/monotonic-clock@0.2.2'; // import wasi:clocks/monotonic-clock@0.2.2
  export type * as WasiHttpTypes022 from 'wasi:http/types@0.2.2'; // import wasi:http/types@0.2.2
  export type * as WasiIoError022 from 'wasi:io/error@0.2.2'; // import wasi:io/error@0.2.2
  export type * as WasiIoPoll022 from 'wasi:io/poll@0.2.2'; // import wasi:io/poll@0.2.2
  export type * as WasiIoStreams022 from 'wasi:io/streams@0.2.2'; // import wasi:io/streams@0.2.2
  export * as incomingHandler from 'wasi:http/incoming-handler@0.2.2'; // export wasi:http/incoming-handler@0.2.2
}
