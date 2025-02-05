declare module 'wasi:io/error@0.2.2' {
  export { Error };
}

export class Error {
  toDebugString(): string;
}
