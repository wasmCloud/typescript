# Contributing to wasmCloud TypeScript

Thank you for your interest in contributing to the wasmCloud TypeScript ecosystem! This guide will help you get started with contributing to our collection of TypeScript examples and project templates for wasmCloud.

Everyone taking part in the project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
What's planned is in the wasmCloud [roadmap](https://github.com/wasmCloud/wasmCloud/blob/main/ROADMAP.md).

## Table of Contents

- [Development Setup](#development-setup)
- [Repository Structure](#repository-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Dependencies](#dependencies)
- [Code Scanning](#code-scanning)
- [Escalating to the CRA Steward](#escalating-to-the-cra-steward)
- [Releases](#releases)
- [Working with wasmCloud](#working-with-wasmcloud)
- [Debugging](#debugging)
- [Getting Help](#getting-help)
## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (the version in `.tool-versions`; each example pins its own in `.nvmrc`)
- [wash CLI](https://wasmcloud.com/docs/installation) (for working with wasmCloud applications)

### Initial Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/your-username/typescript.git
   cd typescript
   ```

2. **Install dependencies for the example or template you're working on:**

   ```bash
   cd examples/components/http-hello-world
   npm install
   ```

## Repository Structure

The repository is organized as follows:

```
├── examples/               # Example components and usage
│   └── components/         # TypeScript component examples
├── templates/              # Project templates for wash new
└── .github/                # GitHub configuration and workflows
```

### Examples

| Example                                         | Path                   | Description                                       |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------- |
| [TypeScript Components](./examples/components/) | `examples/components/` | Sample wasmCloud components written in TypeScript |

#### Creating New Example Components

To create a new example component, copy the structure of an existing example. See [examples/README.md](./examples/README.md) for details on the expected structure and configuration.

### Package Dependencies

- **Examples** should be standalone and self-contained

## Development Workflow

Each example and template is a standalone npm package. Navigate to the directory you're working in and use its npm scripts.

### Build

```bash
npm run build
```

### Run

```bash
wash dev
```

`wash dev` builds the component, starts a local wasmCloud host and deploys the component to it.
HTTP components are served on `127.0.0.1:8000`.

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Document public APIs with JSDoc comments

### Code Style

[ESLint](eslint.config.mjs) checks every example, template and script
with the `recommended` rules and typescript-eslint's `strict` and `stylistic` rules.
The [Lint](.github/workflows/lint.yml) workflow runs it on every pull request,
and a pull request can't merge with a lint error.

Run it from the repository root:

```bash
npm ci
npm run lint
npm run lint:fix  # fix what can be fixed automatically
npm run format:fix  # format with Prettier
```

[Prettier](.prettierrc.json) formats the TypeScript and JavaScript sources,
and the Lint workflow fails if `npm run format` finds a file it would change.

The root `package.json` is repository tooling only:
`wash new` copies a template's own directory, so new projects don't inherit it.

Disable a rule only on the line that needs it,
with a comment saying why.
Order imports external, internal, then relative.

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Directories**: `kebab-case`
- **Functions/Variables**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants/Globals**: `SCREAMING_SNAKE_CASE`

## Testing

Examples and templates have no unit tests yet.
CI checks every pull request instead:

- **Examples** ([examples_.yml](.github/workflows/examples_.yml)) builds each example that changed.
  Most then run under `wash dev` and must answer an HTTP request with the expected body.
  Some are transpiled with jco instead, and their `demo` output is checked.
  A few are only built.
- **Templates** ([templates.yml](.github/workflows/templates.yml)) builds every template
  with `npm ci` and `npm run build`,
  and smoke-tests the HTTP ones under `wash dev`.

When you add an example or template, add it to the matrix in that workflow,
with the `checks` that [scripts/smoke-test.mjs](scripts/smoke-test.mjs) runs against it.
The script's header describes each kind of check.
If you add tests to an example, run them from its `test` script:
CI runs `npm run test` for each example that has one.

A major change must add or update the CI test of what it changes, in the same pull request.
Major changes include a new example or template,
a new or changed route, interface or response,
and a change to how a package builds or runs.
Reviewers don't approve a major change without one.

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

Supported scopes include:

- `examples`: Example components and usage
- `deps`: Dependency updates
- `ci`: CI/CD changes

### Examples

```bash
docs(readme): update installation instructions
```

### Commit Requirements

- **Conventional commits**: All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **Sign-off required**: All commits must be signed off (`git commit -s`) as per [Developer Certificate of Origin (DCO)](https://developercertificate.org/)
- **Descriptive messages**: Explain what and why, not just what
- **Single responsibility**: One logical change per commit
- **Working state**: Each commit should leave the code in a working state

## Pull Request Process

### Before Opening a PR

1. **Create a feature branch:**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and check them:**

   ```bash
   npm run build
   wash dev
   ```

3. **Commit with sign-off:**

   ```bash
   git commit -s -m "feat: your descriptive commit message"
   ```

### PR Requirements

Before creating a PR, ensure that your contribution(s) meet the following criteria:

- **Descriptive title**: Use conventional commit format
- **Clear description**: Explain what changes and why
- **Link issues**: Reference related issues with "Fixes #123"
- **CI coverage**: Add new examples and templates to the CI matrix (see [Testing](#testing))
- **Documentation**: Update docs for user-facing changes

### Reviews

The `main` ruleset enforces these for every pull request:

- An approving review from a [code owner](.github/CODEOWNERS),
  given after the last push by someone other than its author.
  A new push dismisses earlier approvals.
- Every required status check passes,
  including DCO sign-off on every commit.
- Commits are rebased onto `main`; merge commits aren't allowed.

Reviewers check that the change is in scope for the repository,
follows the rest of this guide,
and adds or updates the CI test of anything major it changes (see [Testing](#testing)).
Changes to workflows, the release process or dependencies
are also checked against the [security self-assessment](SECURITY_ASSESSMENT.md).

### PR Checklist

- [ ] Code follows project style guidelines, and `npm run lint` and `npm run format` pass
- [ ] Self-review completed
- [ ] New examples or templates added to the CI matrix
- [ ] Documentation updated if needed
- [ ] All commits are signed off
- [ ] CI checks are passing

## Dependencies

Each example and template is a standalone npm package
with its own `package.json` and a committed `package-lock.json`.

### Selecting dependencies

Before adding a dependency, check that it:

- is needed: prefer what WASI, jco or the platform already provides
- is actively maintained and widely used
- has an [OSI-approved](https://opensource.org/licenses) license compatible with Apache-2.0
- adds as few transitive dependencies as possible

### Obtaining dependencies

- npm packages come from the npm registry,
  at the versions pinned in each package's `package-lock.json`.
- GitHub Actions are pinned to a full commit SHA,
  with the version in a comment.

### Tracking dependencies

- [Dependabot](.github/dependabot.yml) opens weekly version updates
  for the examples, the templates, the root lint tooling and the GitHub Actions,
  after a cooldown so new releases have time to settle.
- Dependabot alerts and security updates cover every `package-lock.json`.
- Each release attaches an SPDX SBOM of the dependencies in its source tarball.

### Vulnerable dependencies

Vulnerabilities in dependencies, reported as Dependabot alerts on `main`, must be fixed,
or dismissed with a stated reason,
within 7 days for critical, 14 days for high and 90 days for medium severity.
Low severity alerts are fixed on a best-effort basis.

[Dependency review](.github/workflows/dependency-review.yml) checks every pull request
against the GitHub Advisory Database.
A pull request that adds or updates a dependency to a version with a known vulnerability,
of any severity, can't merge until it uses a fixed version.
One that adds an npm package version the database lists as malware can't merge at all.
An advisory that doesn't affect this project can be allowed
by adding its ID to `allow-ghsas` in that workflow.

Every advisory that doesn't affect this project,
whether its alert is dismissed or its ID is allowed,
gets a `not_affected` statement in [vex.openvex.json](vex.openvex.json),
with a [justification](https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md#status-justifications)
saying why.
Add the statement, and increment the document's `version` and update its `timestamp`,
in a pull request opened when the alert is dismissed or the ID is allowed.
Each release attaches the document as `wasmcloud-typescript-vX.Y.Z.openvex.json`.

- A dependency whose license is not OSI-approved must be removed
  before the next release.
- Critical and high severity vulnerabilities found by dependency review or Dependabot
  must be fixed or dismissed before each release.

## Code Scanning

[CodeQL](.github/workflows/codeql.yml) analyzes the TypeScript and JavaScript sources and the GitHub
Actions workflows on every pull request, on every push to `main`, and weekly. Its alerts appear in
the repository's Security tab.

- A pull request that adds a high or critical severity CodeQL alert is blocked from merging until
  the alert is fixed or dismissed with a stated reason.
- Alerts open on `main` must be fixed, or dismissed with a stated reason, within 7 days for
  critical, 14 days for high and 90 days for medium severity. Low severity alerts are fixed on a
  best-effort basis.

## Escalating to the CRA Steward

The wasmCloud security team escalates two kinds of event to the Linux Foundation, wasmCloud's CRA
steward, at steward@linuxfoundation.org:

- **Actively exploited vulnerabilities:** a vulnerability in this repository's examples or
  templates for which the security team has reliable evidence that a malicious actor has exploited
  it.
- **Severe incidents:** a security compromise of the project's own infrastructure, such as its
  GitHub organization, release pipeline, signing identities, or published artifacts.

A vulnerability with no evidence of exploitation is not an escalation event and follows the normal
process in the [security policy](https://github.com/wasmCloud/typescript/security/policy).
Remediation never waits on the escalation decision. The same policy covers all of wasmCloud; see
[wasmCloud's CONTRIBUTING.md](https://github.com/wasmCloud/wasmCloud/blob/main/CONTRIBUTING.md#escalating-to-the-cra-steward).

## Releases

Each stable wasmCloud release starts the [Release](.github/workflows/release.yml) workflow with
its version, such as `2.12.0`. Maintainers can also run it on `main` by hand. The workflow creates
the `v2.12.0` tag at the head of `main` and a GitHub Release with:

- `wasmcloud-typescript-v2.12.0.tar.gz`, the source of the tag packed with `git archive`
- an SPDX SBOM generated by Syft from the tarball's `package-lock.json` files
- `wasmcloud-typescript-v2.12.0.openvex.json`, the [VEX document](#vulnerable-dependencies)
- `wasmcloud-typescript-v2.12.0.SHA256SUMS`, plus Sigstore bundles for the SLSA build provenance and the SBOM attestation
- release notes under a Changelog heading, generated from the pull requests merged since the
  previous `vX.Y.Z` release and grouped by label (see [.github/release.yml](.github/release.yml))

Label pull requests that fix vulnerabilities `security` so they're listed under Security fixes.

A release takes the version of the [wasmCloud release](https://github.com/wasmCloud/wasmCloud/releases)
that started it: `v2.12.0` targets wasmCloud `v2.12.0`. Changes made between wasmCloud releases
ship in the release for the next one. Tags are immutable: a mistake is fixed in the next release.

## Working with wasmCloud

To run examples and templates locally you'll need the [wash CLI](https://wasmcloud.com/docs/installation).
From a package directory, `wash dev` builds the component,
starts a local wasmCloud host and deploys the component to it.
Stop it with Ctrl+C.

## Debugging

### Common Issues

- **Build errors**: Ensure dependencies are installed (`npm install`) and try `npm run build`
- **Missing WIT packages**: Run `wash wit fetch`; most packages already do this in `npm run build`

## Getting Help

- **Issues**: Check existing [GitHub issues](https://github.com/wasmCloud/typescript/issues)
- **Community**: Join the [wasmCloud Slack](https://slack.wasmcloud.com/)
- **Documentation**: See [wasmCloud docs](https://wasmcloud.com/docs)

---

Thank you for contributing to wasmCloud TypeScript! Your contributions help make WebAssembly and wasmCloud more accessible to the TypeScript ecosystem.
