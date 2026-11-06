import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fakes = fileURLToPath(new URL('./test/fakes/', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // WASI and wasmCloud interfaces are provided by the host at runtime.
      // Tests run in Node, so each one resolves to an in-memory fake:
      // `wasi:http/types@0.2.6` -> test/fakes/wasi-http-types.ts
      {
        find: /^(wasi|wasmcloud):([\w-]+)\/([\w-]+)@.*$/,
        replacement: `${fakes}$1-$2-$3.ts`,
      },
    ],
  },
  test: {
    coverage: {
      include: ['src/**'],
      thresholds: { statements: 80 },
    },
  },
});
