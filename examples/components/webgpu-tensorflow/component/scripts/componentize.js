/**
 * Build script: componentizes dist/component.js → dist/component.wasm.
 *
 * `jco componentize` can't be used. This world imports wasi:io@0.2.0 (pulled
 * in by wasi-gfx) and other WASI packages older than 0.2.10. jco detects
 * that and silently falls back to a bundled, aliased copy of componentize-js
 * @0.19.3 at node_modules/@bytecodealliance/componentize-js-0-19-3/, which
 * patch-package never touches.
 *
 * Calling componentize() directly forces the patched top-level
 * @bytecodealliance/componentize-js. The patch fixes a splicer bug where
 * WIT resource types in interfaces with no callable functions (e.g.
 * wasi:sockets/network) get no JS class generated, causing ReferenceError
 * at runtime.
 */

import { componentize } from '@bytecodealliance/componentize-js';
import { writeFile } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const result = await componentize({
  sourcePath: join(root, 'dist', 'component.js'),
  witPath: join(root, 'wit'),
  worldName: 'component',
});

const outPath = join(root, 'dist', 'component.wasm');
await writeFile(outPath, result.component);
console.log(`OK Successfully written ${outPath}.`);
