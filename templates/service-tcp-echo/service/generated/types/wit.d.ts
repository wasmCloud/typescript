/// <reference path="./interfaces/wasi-cli-run.d.ts" />
/// <reference path="./interfaces/wasi-clocks-monotonic-clock.d.ts" />
/// <reference path="./interfaces/wasi-io-error.d.ts" />
/// <reference path="./interfaces/wasi-io-poll.d.ts" />
/// <reference path="./interfaces/wasi-io-streams.d.ts" />
/// <reference path="./interfaces/wasi-sockets-instance-network.d.ts" />
/// <reference path="./interfaces/wasi-sockets-network.d.ts" />
/// <reference path="./interfaces/wasi-sockets-tcp-create-socket.d.ts" />
/// <reference path="./interfaces/wasi-sockets-tcp.d.ts" />
declare module 'wasmcloud:templates/typescript-tcp-service@0.1.0' {
  export type * as WasiClocksMonotonicClock023 from 'wasi:clocks/monotonic-clock@0.2.3'; // import wasi:clocks/monotonic-clock@0.2.3
  export type * as WasiIoError023 from 'wasi:io/error@0.2.3'; // import wasi:io/error@0.2.3
  export type * as WasiIoPoll020 from 'wasi:io/poll@0.2.0'; // import wasi:io/poll@0.2.0
  export type * as WasiIoPoll023 from 'wasi:io/poll@0.2.3'; // import wasi:io/poll@0.2.3
  export type * as WasiIoStreams023 from 'wasi:io/streams@0.2.3'; // import wasi:io/streams@0.2.3
  export type * as WasiSocketsInstanceNetwork023 from 'wasi:sockets/instance-network@0.2.3'; // import wasi:sockets/instance-network@0.2.3
  export type * as WasiSocketsNetwork023 from 'wasi:sockets/network@0.2.3'; // import wasi:sockets/network@0.2.3
  export type * as WasiSocketsTcpCreateSocket023 from 'wasi:sockets/tcp-create-socket@0.2.3'; // import wasi:sockets/tcp-create-socket@0.2.3
  export type * as WasiSocketsTcp023 from 'wasi:sockets/tcp@0.2.3'; // import wasi:sockets/tcp@0.2.3
  export * as run from 'wasi:cli/run@0.2.0'; // export wasi:cli/run@0.2.0
}
