import {defineConfig} from '@rslib/core';
import {pluginNodePolyfill} from '@rsbuild/plugin-node-polyfill';

export default defineConfig({
  plugins: [pluginNodePolyfill()],
  source: {
    entry: {
      'bundled-rsbuild': './src/bundled-rsbuild.ts',
    },
  },
  lib: [
    {
      autoExternal: false,
      bundle: true,
      format: 'esm',
      output: {
        target: 'web',
        // minify: true,
        distPath: {
          root: './dist/esm',
        },
        externals: /wasi:*/,
      },
      performance: {
        chunkSplit: {
          strategy: 'all-in-one',
        },
      },
      tools: {
        rspack: (config) => {
          config.optimization = config.optimization || {};
          config.optimization.runtimeChunk = false;
          return config;
        },
      },
    },
  ],
});
