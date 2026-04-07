import { defineConfig } from "rolldown";
import Raw from "unplugin-raw/rolldown";

export default defineConfig({
  input: "src/component.ts",
  external: [/wasi:.*/, /wasmcloud:.*/],
  plugins: [Raw()],
  output: {
    file: "dist/component.js",
    format: "esm",
  },
});
