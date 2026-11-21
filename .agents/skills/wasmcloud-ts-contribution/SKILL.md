---
name: wasmcloud-ts-contribution
description: Commit, pull request, release, and documentation conventions for the wasmCloud TypeScript repository, covering Conventional Commits titles and scopes, DCO sign-off, the CI-test requirement for major changes, the security label, draft PRs, rebasing, and semantic line breaks. Use when writing a commit message, preparing or reviewing a pull request, checking PR readiness, or editing Markdown docs such as README.md, CONTRIBUTING.md, or example and template READMEs.
---

# Contribution conventions

Read only the sections relevant to the current task.
These conventions describe how to prepare a contribution; they do not authorize creating a PR or publishing changes.

## Commits

- Write titles as [Conventional Commits](https://www.conventionalcommits.org),
  for example `fix(http-axios): handle a non-JSON response`.
- Use a scope that names the example or template, or `examples`, `templates`, `deps`, `ci`, or `scripts`.
- Keep titles under 70 characters, including the ` (#NNN)` a merge appends.
- Keep commits small, and organize them around semantically distinct changes.
  Each commit leaves every package building.
- Add a body only when the title and diff do not make the reason for the change clear.
  Keep it to a few lines on why, and wrap it at 70 characters.
- Sign off every commit with `git commit -s`.
  The DCO `Signed-off-by:` trailer does not count as a body.
- Never merge `main` into a branch.
  Rebase the branch onto `main` instead, including to resolve conflicts;
  the ruleset allows only rebased commits.

## Releases

Releases are cut by the [Release](../../../.github/workflows/release.yml) workflow
when wasmCloud releases; do not create tags or edit release notes by hand.
Release notes are generated from merged PRs and grouped by label,
so label a PR that fixes a vulnerability `security`.

## Pull requests

- After local builds and smoke tests pass, open a pull request as a draft,
  and iterate on it until CI is green.
  Re-run the relevant local checks after each fix before pushing it.
- If a personal fork is configured as a remote, open the draft against the fork first.
  Open the pull request against upstream once it is ready.
- Keep the body succinct and human readable.
  A few sentences on what changed and why is usually enough.
  Link related issues with `Fixes #123`.
- Do not use an excessive number of sections.
- Do not include verification methodology
  (test commands, "Validation" sections)
  unless explicitly asked to.
  The [test policy](../../../CONTRIBUTING.md#testing) still applies:
  a major change, such as a new example or template, a new or changed route or response,
  or a change to how a package builds or runs,
  must add or update its CI test in the same PR.
  Explain why a change needs no new test, or why a local check could not run.

## Documentation

- Use [semantic line breaks](https://sembr.org) instead of run-on paragraphs.
- Prefer a list to a dense paragraph that covers several facets in prose.
- Keep the tables in [`examples/README.md`](../../../examples/README.md)
  and [`templates/README.md`](../../../templates/README.md) in sync with the directories.
