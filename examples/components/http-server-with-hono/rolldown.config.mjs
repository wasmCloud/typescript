import { defineConfig } from 'rolldown';

// Bundles the component and all of its npm dependencies into a single file
// for `jco componentize`.
export default defineConfig({
  input: 'src/index.ts',
  external: /wasi:.*/,
  platform: 'browser',
  output: {
    file: 'dist/index.bundled.js',
    format: 'esm',
    sourcemap: true,
  },
});
