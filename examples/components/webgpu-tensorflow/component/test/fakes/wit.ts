// componentize-qjs provides a `wit` global for building WIT futures and streams.
// This fake builds futures that resolve straight away to the value given.

export interface FakeFuture {
  value: unknown;
  type: unknown;
  readable: { read(): Promise<unknown>; drop(): void; dropped: boolean };
}

export const created: FakeFuture[] = [];

export const wit = {
  Future: {
    from(value: unknown, type: unknown): FakeFuture {
      const readable = {
        dropped: false,
        read: async () => value,
        drop() {
          readable.dropped = true;
        },
      };
      const future = { value, type, readable };
      created.push(future);
      return future;
    },
    RESULT_OPTION_OTHER_ERROR_CODE: 'result<option<trailers>, error-code>',
    RESULT_VOID_WASI_HTTP_TYPES_0_3_0_ERROR_CODE: 'result<_, error-code>',
  },
};
