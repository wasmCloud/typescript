import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from '@rollup/plugin-alias';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import url from '@rollup/plugin-url';
import typescript from '@rollup/plugin-typescript';
import { defineEnv } from "unenv";

const { env } = defineEnv();

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
            include: [
                // "./images/**",
                "./src/static/**",
                "./models/**/*.bin",
            ],
            exclude: [
                "./src/static/static.ts",
            ],
            // allow up to 10MB of static assets to be inlined.
            // needed for large models.
            limit: MEGABYTE * 10,
        }),
        typescript(),
        alias({
            entries: {
                ...env.alias,
                "node:util/types": "./node-util-types-polyfil.js",
                "util/types": "./node-util-types-polyfil.js",
            },
        }),
        json({
            exclude: [
                // ignore static assets
                "./src/static/**",
            ]
        }),
        nodeResolve(),
        commonjs({
            transformMixedEsModules: true,
        }),
        inject(env.inject),
    ],
};
