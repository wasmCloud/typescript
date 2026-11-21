---
name: wasmcloud-ts-packages
description: How to add, change, build, and smoke-test the TypeScript example components and wash new templates, covering package layout, the wash wit fetch, jco guest-types, tsc or bundler, and jco componentize build pipeline, .wash/config.yaml, wash dev, the examples_.yml and templates.yml CI matrices, and scripts/smoke-test.mjs checks. Use when creating or changing anything under examples/components/ or templates/.
---

# Examples and templates

## Structure

Copy the closest existing package rather than starting from scratch.
[`http-hello-world`](../../../examples/components/http-hello-world/) is the simplest example
and [`http-hello-world-hono`](../../../templates/http-hello-world-hono/) the simplest template.
Each package has:

- `package.json` with `"license": "Apache-2.0"` and a `build` script that runs, in order:
  `wash wit fetch`, `jco guest-types` into `generated/types`,
  `tsc` or a bundler into `dist/`, and `jco componentize` into `dist/<name>.wasm`.
- A committed `package-lock.json`.
- `.wash/config.yaml` whose `build.component_path` is the `.wasm` that `jco componentize` writes.
- `wit/world.wit` and `wkg.lock`; `wit/deps/` is fetched by the build.
- A `.gitignore` covering `node_modules/`, `dist/`, `generated/`, and `wit/deps/`,
  as most packages have; `npm run build` recreates them.
- A `README.md` that says what the package demonstrates and how to run it.

Add the package to the table in [`examples/README.md`](../../../examples/README.md)
or [`templates/README.md`](../../../templates/README.md).

## Building and running

From the package directory, with the Node.js version in `.tool-versions` or the package's `.nvmrc`:

```shell
npm ci
npm run build
wash dev            # serves HTTP components on 127.0.0.1:8000
```

Packages that `wash dev` cannot run (`skip-wash-dev` in CI) are checked with
`npm run transpile` and `npm run demo` instead.

Missing WIT packages usually mean `wash wit fetch` did not run; `npm run build` does it.

## CI

Every example and template must be in its workflow's matrix, in the same PR:

- Examples: [`examples_.yml`](../../../.github/workflows/examples_.yml).
  `folder` is the directory name,
  `wasm-bin` is the file name of `component_path`, and must match it exactly.
  Set `skip-wash-dev: true` and a `run: demo` check for packages tested through `jco transpile`,
  and `dist-dir` if the component is not written to `dist/`.
- Templates: [`templates.yml`](../../../.github/workflows/templates.yml).
  Add `prepare` for setup such as creating a mounted directory.
  Multi-component templates are build-only.
- `checks` are run by [`scripts/smoke-test.mjs`](../../../scripts/smoke-test.mjs);
  its header documents every field (`path`, `method`, `body`, `run`, `field`, `decode`,
  `equals`, `startsWith`, `contains`, `length`).
  Checks are retried, so they must be safe to repeat.
- If a package has a real `test` script, CI runs it after the build.

Run the same checks locally against `wash dev` from the package directory:

```shell
CHECKS='[{"path":"/","equals":"Hello from Typescript!"}]' RETRIES=5 \
  node ../../../scripts/smoke-test.mjs
```

Adjust the relative path for templates (`../../scripts/smoke-test.mjs`).
If `wash` is not installed, build with `npm run build`, and say that the smoke test could not run.

## Checks

```
- [ ] npm ci && npm run build      (in each package changed)
- [ ] npm run test --if-present
- [ ] wash dev, then smoke-test.mjs with the matrix checks
- [ ] Matrix entry and README table updated for a new package
```
