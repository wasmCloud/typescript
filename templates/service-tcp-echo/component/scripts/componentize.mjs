/**
 * Build script: componentizes dist/component.js → dist/component.wasm.
 *
 * This replaces `jco componentize` because jco bundles its own copy of
 * @bytecodealliance/componentize-js (which may differ from the top-level
 * devDependency version where our patch-package fix is applied).
 *
 * The patch fixes a bug in the spidermonkey-embedding-splicer: it does not
 * generate a JS class for WIT resource types whose owning interface has no
 * callable functions (e.g. wasi:sockets/network). Using componentize-js
 * directly ensures the patch is always active.
 *
 * See patches/@bytecodealliance+componentize-js+*.patch for the fix details.
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
  worldName: 'typescript-tcp-component',
});

const outPath = join(root, 'dist', 'component.wasm');
await writeFile(outPath, result.component);
console.log(`OK Successfully written ${outPath}.`);
