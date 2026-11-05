import {defineConfig} from 'rolldown';

// Bundles the component and all of its npm dependencies into a single file
// for `jco componentize`. axios resolves to its browser build.
export default defineConfig({
  input: 'src/component.ts',
  external: /wasi:.*/,
  platform: 'browser',
  output: {
    file: 'dist/component.js',
    format: 'esm',
  },
});
