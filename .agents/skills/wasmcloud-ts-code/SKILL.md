---
name: wasmcloud-ts-code
description: Code reuse, readability, and TypeScript style conventions for the wasmCloud TypeScript repository, covering reusing existing helpers and dependencies, keeping examples self-contained, comment style, strict TypeScript, naming, and import order. Use when implementing, refactoring, or reviewing TypeScript or JavaScript in examples/, templates/, or scripts/.
---

# Code changes

Follow the core rules in [AGENTS.md](../../../AGENTS.md), including searching for existing code first.

## Reuse and structure

- Prefer the platform, WASI, Jco, and existing dependencies before adding a dependency.
  Follow the [dependency policy](../../../CONTRIBUTING.md#selecting-dependencies) when a new one is needed.
- Extend existing scripts and test harnesses before introducing new infrastructure.
  Keep additions focused on the current requirement;
  avoid parallel implementations, generic frameworks, and configuration layers for hypothetical future needs.
- Examples and templates are standalone and meant to be copied.
  Do not import across packages or add a shared package;
  a little duplication between examples is expected.
- Keep each example focused on the one thing it demonstrates.

## Comments

- Do not leave maintainer- or reviewer-facing comments in the code.
  Comments describe what the code does and why,
  not the history of the change, the review that prompted it, or the task you were given.
- Templates are what users start from; comment them for a reader new to wasmCloud.
- Avoid run-on blocks of code.
  Group statements semantically, separated by blank lines.
- Put the explanation of a dense chunk of code before it, not inside or after it.

## TypeScript style

- There is no linter or formatter configuration on `main`.
  Match the style of the surrounding code, and the package's existing `tsconfig.json`.
- Keep `strict` on; prefer explicit types and `unknown` with narrowing over `any`.
- Order imports external, internal, then relative.
  WIT imports (`wasi:*`, `wasmcloud:*`) are external.
- Use `@ts-ignore` or `@ts-expect-error` only with a description of why,
  such as a generated type that varies between Jco versions.
- Names: `kebab-case` files and directories, `camelCase` functions and variables,
  `PascalCase` types, and `SCREAMING_SNAKE_CASE` constants.
- Do not edit generated files under `generated/` or `wit/deps/`;
  they come from `npm run build`.
