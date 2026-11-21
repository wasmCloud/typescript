---
name: wasmcloud-ts-dependencies
description: Dependency selection, update, and advisory handling for the wasmCloud TypeScript repository, covering per-package package-lock.json files, npm overrides for vulnerable transitive dependencies, Dependabot PRs, dependency review and allow-ghsas, and OpenVEX statements in vex.openvex.json. Use when adding, removing, or bumping an npm package or GitHub Action, reviewing a Dependabot PR, or responding to a vulnerability alert.
---

# Dependencies and advisories

The [dependency policy](../../../CONTRIBUTING.md#dependencies) is the source of truth.

## Adding or bumping

- Check whether WASI, Jco, or the platform already provides it,
  and prefer a maintained package with few transitive dependencies
  and an OSI-approved license compatible with Apache-2.0.
- Change only the packages that need it.
  Run `npm install` in each package so its `package-lock.json` updates,
  then `npm ci && npm run build` to confirm it.
- A bump of a tool shared by many packages, such as Jco or TypeScript, usually applies to all of them.
  Find them with `grep -l '"<package>"' examples/components/*/package.json templates/*/package.json`.
- Fix a vulnerable transitive dependency with an `overrides` entry in that package's `package.json`,
  matching the existing `minimatch` overrides, when no direct upgrade fixes it.

## Advisories

Fix by upgrading whenever possible.
Only an advisory that does not affect this project may be dismissed or allowed:

- Dependency review: add its ID to `allow-ghsas` in
  [`dependency-review.yml`](../../../.github/workflows/dependency-review.yml).
- In the same PR, add a `not_affected` statement with a
  [justification](https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md#status-justifications)
  to [`vex.openvex.json`](../../../vex.openvex.json),
  increment its `version`, and update its `timestamp`.

Never allow an advisory just to make CI pass.
