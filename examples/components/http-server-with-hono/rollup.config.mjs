// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts', // Entry point is the TypeScript source
  output: {
    file: 'dist/index.bundled.js', // Output bundled JS file
    format: 'esm', // Output format as ES Module
    sourcemap: true,
  },
  plugins: [
    typescript({
      // Compile TypeScript first
      tsconfig: './tsconfig.json',
      sourceMap: true,
      inlineSources: true,
    }),
    resolve({
      // Resolve node_modules imports
      preferBuiltins: false, // Important for WASI environment
      browser: true, // Treat as browser environment for dependencies
    }),
    commonjs(), // Convert CommonJS modules to ES modules
    json(), // Handle JSON imports
  ],
};
