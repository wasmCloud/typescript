import {defineConfig} from 'rolldown';
import alias from '@rollup/plugin-alias';
import inject from '@rollup/plugin-inject';
import url from '@rollup/plugin-url';
import {defineEnv} from 'unenv';

const {env} = defineEnv();

const MEGABYTE = 1024 * 1024;

export default defineConfig({
  input: 'src/service.ts',
  external: /wasi:.*/,
  platform: 'browser',
  // @rollup/plugin-url turns the weight shards into JS modules that export a data URL.
  moduleTypes: {
    '.bin': 'js',
  },
  output: {
    file: 'dist/service.js',
    format: 'esm',
    codeSplitting: false,
  },
  plugins: [
    url({
      // Inline model weight shards as base64 data URLs (the bulk of the wasm payload)
      include: ['./models/**/*.bin'],
      limit: MEGABYTE * 10,
    }),
    alias({
      entries: {
        ...env.alias,
        'node:util/types': './node-util-types-polyfill.js',
        'util/types': './node-util-types-polyfill.js',
      },
    }),
    inject(env.inject),
  ],
});
