import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import url from '@rollup/plugin-url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vitest/config';

const fakes = fileURLToPath(new URL('./test/fakes/', import.meta.url));
const staticDir = fileURLToPath(new URL('./src/static/', import.meta.url));

// The rolldown build inlines the static UI assets as data URLs with @rollup/plugin-url.
// Tests do the same, under an id that doesn't end in `.css`,
// so vitest doesn't swap the stylesheet for an empty module.
const dataUrls = url({ include: [`${staticDir}**`], limit: 10 * 1024 * 1024 });
const suffix = '.data-url';
const staticAssets: Plugin = {
  name: 'static-assets-as-data-urls',
  enforce: 'pre',
  resolveId(source, importer) {
    if (importer?.startsWith(staticDir) && /\.(html|css|js|jpg)$/.test(source)) {
      return `\0${resolve(dirname(importer), source)}${suffix}`;
    }
  },
  load(id) {
    if (id.startsWith('\0') && id.endsWith(suffix)) {
      const load = dataUrls.load as (id: string) => Promise<string>;
      return load.call(this, id.slice(1, -suffix.length));
    }
  },
};

export default defineConfig({
  plugins: [staticAssets],
  resolve: {
    alias: [
      // WASI interfaces are provided by the host at runtime.
      // Tests run in Node, so each one resolves to an in-memory fake:
      // `wasi:http/types@0.3.0` -> test/fakes/wasi-http-types.ts
      {
        find: /^(wasi|wasmcloud):([\w-]+)\/([\w-]+)@.*$/,
        replacement: `${fakes}$1-$2-$3.ts`,
      },
    ],
  },
  test: {
    setupFiles: ['./test/setup.ts'],
    coverage: {
      // Only the component's TypeScript is measured.
      // src/static also holds the browser UI (script.js, HTML, CSS, images),
      // which the component serves as assets but never runs.
      include: ['src/**/*.ts'],
      thresholds: { statements: 80 },
    },
  },
});
