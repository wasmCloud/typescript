import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // Only the component source is measured.
      // demo.js drives the transpiled wasm, so it isn't unit tested.
      include: ['src/**'],
      thresholds: { statements: 80 },
    },
  },
});
