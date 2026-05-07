import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import inject from "@rollup/plugin-inject";
import json from "@rollup/plugin-json";
import url from "@rollup/plugin-url";
import typescript from "@rollup/plugin-typescript";
import { defineEnv } from "unenv";

const { env } = defineEnv();

const MEGABYTE = 1024 * 1024;

export default {
    input: "src/service.ts",
    external: /wasi:.*/,
    output: {
        file: "dist/service.js",
        format: "esm",
        inlineDynamicImports: true,
    },
    plugins: [
        url({
            // Inline model weight shards as base64 data URLs (the bulk of the wasm payload)
            include: ["./models/**/*.bin"],
            limit: MEGABYTE * 10,
        }),
        typescript(),
        alias({
            entries: {
                ...env.alias,
                "node:util/types": "./node-util-types-polyfill.js",
                "util/types": "./node-util-types-polyfill.js",
            },
        }),
        json(),
        nodeResolve(),
        commonjs({
            transformMixedEsModules: true,
        }),
        inject(env.inject),
    ],
};
