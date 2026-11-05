import {defineConfig} from 'rolldown';
import url from '@rollup/plugin-url';

const MEGABYTE = 1024 * 1024;

export default defineConfig({
  input: 'src/component.ts',
  external: /wasi:.*/,
  platform: 'node',
  // @rollup/plugin-url turns these into JS modules that export a data URL.
  moduleTypes: {
    '.css': 'js',
    '.html': 'js',
    '.jpg': 'js',
  },
  output: {
    file: 'dist/component.js',
    format: 'esm',
    codeSplitting: false,
  },
  plugins: [
    url({
      // Inline the static UI assets as base64 data URLs
      include: ['./src/static/**'],
      exclude: ['./src/static/static.ts'],
      limit: MEGABYTE * 10,
    }),
  ],
});
