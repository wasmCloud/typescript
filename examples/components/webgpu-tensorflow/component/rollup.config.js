import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import url from "@rollup/plugin-url";
import typescript from "@rollup/plugin-typescript";

const MEGABYTE = 1024 * 1024;

export default {
    input: "src/component.ts",
    external: /wasi:.*/,
    output: {
        file: "dist/component.js",
        format: "esm",
        inlineDynamicImports: true,
    },
    plugins: [
        url({
            // Inline the static UI assets as base64 data URLs
            include: ["./src/static/**"],
            exclude: ["./src/static/static.ts"],
            limit: MEGABYTE * 10,
        }),
        typescript(),
        json(),
        nodeResolve(),
        commonjs({ transformMixedEsModules: true }),
    ],
};
