import { defineConfig } from 'rolldown';

// Bundles the component and all of its npm dependencies into a single file
// for `jco componentize`.
export default defineConfig({
  input: 'src/http-password-checker.ts',
  external: /wasi:.*/,
  output: {
    file: 'dist/http-password-checker.js',
    format: 'esm',
  },
});
