---
name: wasmcloud-ts-automation
description: Conventions for CI and developer automation in the wasmCloud TypeScript repository, covering where scripts live, the .mjs script structure with scripts/lib/actions.mjs, action pinning, permissions, zizmor, path filters, and workflow YAML style. Use when creating or changing files under .github/workflows/, .github/dependabot.yml, or scripts/; not needed just to run existing checks.
---

# CI and developer automation

Read the sections that match the files being changed.

## Scripts

- Prefer a script that CI calls, and that is just as easy to run locally, over logic inlined in a workflow.
  Add it to [`scripts/`](../../../scripts/) as a plain JavaScript ES module (`.mjs`) run directly with `node`.
  There is no TypeScript toolchain at the root, so do not add `.ts` scripts or a type-check step.
- Use only Node.js built-ins; the root has no `package.json`.
- Avoid bash scripts.
- Put shared helpers in [`scripts/lib/actions.mjs`](../../../scripts/lib/actions.mjs),
  and reuse its `env`, `api`, `setOutput`, and `run` helpers.
- Structure a script as an `async` `main()` passed to `run(main)`,
  which reports a thrown error and sets `process.exitCode`.
  Document its inputs in a header comment, as [`smoke-test.mjs`](../../../scripts/smoke-test.mjs) does.
- Treat parsed input as untyped, and validate it into a known shape before using it.
- A script may use GitHub Actions logging, but it must work outside GitHub Actions as well.

## Workflows

- Pin every action to a full commit SHA with the version in a trailing comment.
- Start each workflow with `permissions: {}` and grant each job only what it needs.
- Check out with `persist-credentials: false`.
- Pass `${{ }}` expressions into `run:` steps through `env:`, not by interpolating them into the script.
  [zizmor](../../../.github/workflows/zizmor.yml) checks this on every PR.
- A change under `scripts/` reruns every example, through the `ci` path filter in `examples_.yml`.
  Add a new shared path to the filter that should test it.
- Never write YAML lists in the inline `[a, b]` form.
  Write one item per line so that edits produce small diffs:

  ```yaml
  branches:
    - main
  ```
