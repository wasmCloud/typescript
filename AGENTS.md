# Agent instructions

## Core rules

- Follow [CONTRIBUTING.md](CONTRIBUTING.md); read the sections relevant to the task.
  Check for more specific `AGENTS.md` files in the directories you change.
- Do development work on a feature branch, never directly on `main`.
- Search for existing implementations, helpers, test utilities, dependencies, and tooling before adding code.
  Reuse or extend them where their behavior and ownership fit,
  and keep new abstractions focused on the current requirement.
- Keep conversation, prompt, and iteration history out of code comments, commits, and PR descriptions.
  Comments explain the code and its rationale.
- Run relevant local builds, tests, and smoke tests before opening a PR.
  Re-run relevant checks after fixes, and report checks that could not run.
- A more specific `AGENTS.md` takes precedence over the skills below for the directory it covers.
  Repository instructions and checked-in lint and format configuration take precedence over external skills.

## Repository layout

There is no root `package.json`.
Every directory under `examples/components/` and `templates/` is a standalone npm package
with its own `package-lock.json`;
run `npm` commands from inside the package you are changing.
`scripts/` holds the Node.js scripts that CI runs.

## Task-specific guidance

Read only the skills relevant to the current task, before doing that work.
Combine skills when needed, such as code and package guidance for a new example.
If the harness does not discover local skills, open the linked `SKILL.md` files directly.
Follow their references only when the referenced topic is needed.

| Task | Skill |
| --- | --- |
| Implementing, refactoring, or reviewing TypeScript or JavaScript | [Code reuse and TypeScript style](.agents/skills/wasmcloud-ts-code/SKILL.md) |
| Preparing commits or PRs, checking PR readiness, or editing docs | [Contribution conventions](.agents/skills/wasmcloud-ts-contribution/SKILL.md) |
| Adding, changing, building, or smoke-testing an example or template | [Examples and templates](.agents/skills/wasmcloud-ts-packages/SKILL.md) |
| CI workflows or files under `scripts/` | [CI and developer automation](.agents/skills/wasmcloud-ts-automation/SKILL.md) |
| Adding or updating npm dependencies, Dependabot PRs, advisories, or VEX | [Dependencies and advisories](.agents/skills/wasmcloud-ts-dependencies/SKILL.md) |
| WIT, Wasm components, wash, or Jco | [Component guidance](.agents/skills/wasmcloud-ts-components/SKILL.md) |
