import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: "src/component.ts",
  output: {
    file: "dist/component.js",
    format: "esm",
  },
  plugins: [
    // NOTE: typescript plugin is breaking on custom resolution (node-resolve),
    // so we pin to 12.1.1
    //
    // see: https://github.com/rollup/plugins/issues/1877
    typescript(),

    // NOTE: we use rollup & the nodeResolve plugin here to ensure that all ndoe dependencies
    // are bundled into a *single* file.
    //
    // see: https://github.com/rollup/plugins/tree/master/packages/node-resolve
    nodeResolve({
      browser: true,
    }),

    commonjs(),

    json(),
  ],
};
