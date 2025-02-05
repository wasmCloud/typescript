declare module 'wasi:io/error@0.2.0' {
  export { Error };
}

export class Error {
  toDebugString(): string;
}
