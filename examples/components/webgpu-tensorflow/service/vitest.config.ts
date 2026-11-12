import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vitest/config';

const fakes = fileURLToPath(new URL('./test/fakes/', import.meta.url));
const models = fileURLToPath(new URL('./models/', import.meta.url));

// The build inlines the model weight shards as data URLs.
// Tests never run the real models, so each shard is a stub
// whose bytes are its own file name, and the weights are never read.
const stubWeights: Plugin = {
  name: 'stub-model-weights',
  enforce: 'pre',
  load(id) {
    if (id.startsWith(models) && id.endsWith('.bin')) {
      const bytes = Buffer.from(basename(id)).toString('base64');
      return `export default ${JSON.stringify(`data:application/octet-stream;base64,${bytes}`)};`;
    }
  },
};

export default defineConfig({
  plugins: [stubWeights],
  resolve: {
    alias: [
      // WASI interfaces are provided by the host at runtime.
      // Tests run in Node, so each one resolves to an in-memory fake:
      // `wasi:sockets/types@0.3.0` -> test/fakes/wasi-sockets-types.ts
      {
        find: /^(wasi|wasmcloud):([\w-]+)\/([\w-]+)@.*$/,
        replacement: `${fakes}$1-$2-$3.ts`,
      },
    ],
  },
  test: {
    setupFiles: ['./test/setup.ts'],
    // Stylizing real images on TensorFlow.js's CPU backend takes a few seconds.
    testTimeout: 30_000,
    coverage: {
      include: ['src/**/*.ts'],
      thresholds: { statements: 80 },
    },
  },
});
