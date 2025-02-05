declare module 'wasi:io/poll@0.2.2' {
  export { Pollable };
  export function poll(in_: Array<Pollable>): Uint32Array;
}

export class Pollable {
  ready(): boolean;
  block(): void;
}
