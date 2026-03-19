import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/service.ts",
  external: /wasi:.*/,
  output: {
    file: "dist/service.js",
    format: "esm",
  },
});
