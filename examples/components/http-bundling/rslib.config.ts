import { defineConfig } from '@rslib/core';
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";


export default defineConfig({
  plugins:[pluginNodePolyfill()],
  source: {
    entry: {
      "http-bundling": './src/http-bundling.ts',
    },
  },
  lib: [
    {
      autoExternal: false,
      bundle: true,
      format: 'esm',
      output: {
        target: "web",
        // minify: true,
        distPath: {
          root: './dist/esm',
        },
        externals: /wasi:*/,
      },
    }
  ],
});