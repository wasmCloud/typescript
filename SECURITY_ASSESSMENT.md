# Security self-assessment

Last reviewed: 2026-11-06

This assessment is the threat model and attack surface analysis
of the wasmCloud/typescript repository:
its examples and templates, its CI and its releases.
How the repository works, and the interfaces of each template,
are in [ARCHITECTURE.md](ARCHITECTURE.md).

The wasmCloud host that runs the components,
and the sandbox it gives them,
are covered by the wasmCloud
[self-assessment](https://github.com/wasmCloud/wasmCloud/blob/main/SELF_ASSESSMENT.md)
and [threat model](https://github.com/wasmCloud/wasmCloud/blob/main/THREAT_MODEL.md).

## What is at stake

Templates are not run from this repository.
`wash new` copies them, with their code and lockfiles, into users' own projects,
and users build on them from there.
So the main risk is a supply-chain one:
anything wrong in a template at a release tag
ends up in every project created from that tag,
and stays there until its owner copies a newer release.

Project/repository assets that should be watched closely:

- the template and example sources, and their `package-lock.json` files
- the `vX.Y.Z` tags and the release assets
- the GitHub Actions workflows and the tokens they get
- the repository settings and the `main` ruleset

## Attack surface analysis

These are the ways code or data from outside reaches those assets,
from least to most privileged:

- **Pull requests**, usually from forks.
  The Examples, Templates, Lint, CodeQL and zizmor workflows run their code
  with a read-only token and no secrets, on fresh GitHub-hosted runners.
  A pull request's `npm ci` and build scripts run there too.
- **npm packages**, installed from each package's `package-lock.json`
  in CI and in users' projects.
- **WIT packages**, fetched from the `wasi.dev` registry by `wash wit fetch`
  at the versions and digests in each package's `wkg.lock`.
- **Pushes to `main` and tags.**
  They run the same workflows as pull requests.
  None restores a dependency cache, so a pull request can't plant one.
- **The weekly baseline scan**, which gets an OIDC token
  to sign and publish its results to grc.store.
- **The release dispatch.**
  Only wasmCloud's `release-tag.yml` can send it,
  and maintainers can start the same workflow by hand on `main`.
  Its only input is a version, which the workflow rejects unless it's `X.Y.Z`.
  The release job is the only one with write access:
  it creates the tag and release, and signs the assets.
  It runs only on `main`, and builds nothing from a pull request.

The critical paths are therefore the merge into `main`, which the ruleset guards,
and the release job, which only a trusted dispatch on `main` can start.

## Threats and mitigations

### Malicious or mistaken code merged into a template

- Every change goes through a pull request:
  the `main` ruleset blocks direct pushes, force pushes and deletion,
  and admins can bypass it only through a pull request.
- A maintainer who didn't push the last commit must approve,
  including a code owner for each changed path.
- CodeQL analyzes every pull request,
  and a change that adds a high or critical alert can't merge.
- Every example and template is unit tested, linted and built on pull requests that change it,
  and the HTTP ones are smoke-tested under `wash dev`.
  Unit tests must cover at least 80% of each package's statements.

### A compromised or vulnerable npm dependency

- Each package commits its `package-lock.json`,
  and CI installs from it with `npm ci`.
- Dependabot opens version updates after a cooldown,
  so a newly published malicious version has time to be caught and pulled.
- Dependency review blocks a pull request that adds a dependency version
  with a known vulnerability, or one listed as malware.
- Dependabot alerts have fix deadlines, in
  [CONTRIBUTING.md](CONTRIBUTING.md#vulnerable-dependencies).
- Each release attaches an SPDX SBOM, so users can check what a tag pinned.

### A compromised CI workflow

- No workflow runs on `pull_request_target` or `workflow_run`,
  so code from a fork never runs with write access or secrets.
- Every workflow grants no token permissions at the top level;
  each job asks for only what it uses.
- Checkouts don't persist credentials.
- Every action and reusable workflow is pinned to a full commit SHA,
  except the OSPS Baseline publishing workflow, which grc.store requires by tag.
- Untrusted values reach shell steps through environment variables, not `${{ }}` expansion.
- zizmor and CodeQL audit the workflows on every pull request.

### A tampered release

- Releases are cut only by [release.yml](.github/workflows/release.yml) on `main`.
- Only wasmCloud's `release-tag.yml` on `main` can send the dispatch that starts one,
  through an [octo-sts trust policy](.github/chainguard/wasmcloud-release-dispatch.sts.yaml).
- Tags are immutable: the workflow refuses a version that already exists.
- The tarball, SBOM and checksum file carry Sigstore-signed SLSA provenance.
  [README.md](README.md#versioned-releases) shows how to verify it,
  including that `release.yml` signed it.

### Secrets committed to the repository

- The repository stores no secrets.
  A few organization secrets are visible to it, but no workflow here references them;
  the workflows use only their own job token.
- Secret scanning and push protection are on,
  so a push with a detected secret is blocked.

## Secure design principles

How the repository applies the
[Saltzer and Schroeder](https://web.mit.edu/Saltzer/www/publications/protection/) principles:

- **Least privilege.**
  Workflows grant no token permissions at the top level, and each job asks only for what it uses;
  only the release job can write to the repository,
  and the scanning jobs can only upload their results.
  A component gets only the WASI and wasmCloud interfaces its `wit/world.wit` imports,
  and the host decides what each one may reach.
- **Fail-safe defaults.**
  Dependency review fails on a vulnerability of any severity,
  and a missing or failed required check blocks the merge.
  Template routes answer unknown paths with `404`,
  and reject input they can't parse with `400` rather than guessing.
- **Complete mediation.**
  Every change to `main` goes through the ruleset and its required checks;
  there is no direct push, and admins bypass it only through a pull request.
- **Separation of privilege.**
  A change needs approval from a maintainer who didn't push its last commit,
  including a code owner for each changed path.
- **Economy of mechanism.**
  The repository runs no service and publishes no registry package:
  a release is a source tarball of a tag, with its SBOM, VEX and signatures.
  Templates are small, single-purpose starting points.
- **Least common mechanism.**
  CI jobs run on fresh GitHub-hosted runners,
  and workflows that run on `main` and tags restore no dependency cache a pull request could have written.
- **Open design.**
  Everything, including the workflows and this assessment, is public,
  and releases can be verified with public tooling (`gh attestation verify`).
- **Psychological acceptability.**
  Verifying a release is one command,
  and the checks contributors need are `npm test`, `npm run lint` and `npm run format`.

## Common weaknesses countered

The weaknesses from the [CWE Top 25](https://cwe.mitre.org/top25/) and the
[OWASP Top 10](https://owasp.org/Top10/) that apply to this repository,
and how they're countered:

- **Injection in workflows (CWE-78, CWE-94).**
  Untrusted values reach shell steps only through environment variables;
  zizmor and CodeQL check every workflow on every pull request.
- **Improper input validation (CWE-20).**
  The Hono templates check request bodies with zod schemas,
  answer a malformed JSON body with `400`,
  and accept only bounded integers for pagination parameters.
  `http-filesystem-handler-hono` accepts only single-segment file names.
- **Injection into headers and logs (CWE-113, CWE-117).**
  A client's `X-Request-Id` is echoed only if it's a short token of letters, digits, `_`, `.` or `-`;
  any other value is replaced with a new random ID.
- **Sensitive information in logs (CWE-532).**
  `http-logging-handler-hono` redacts `Authorization`, `Proxy-Authorization` and `Cookie`
  when it logs request headers.
- **Path traversal (CWE-22).**
  The host confines `http-filesystem-handler-hono` to its preopened `/data` directory,
  and the component rejects file names that aren't a single path segment.
- **Cross-site scripting (CWE-79).**
  Routes that echo request data answer with JSON or plain text;
  the HTML routes serve fixed pages.
- **Clickjacking and content sniffing (CWE-1021).**
  The Hono handler templates set `X-Frame-Options`, `X-Content-Type-Options: nosniff`
  and a no-referrer policy on every response with Hono's `secureHeaders()`.
- **Server-side request forgery (CWE-918).**
  `http-client` fetches whatever URL it's given, by design;
  this is documented below as a risk users inherit.
- **Vulnerable and malicious dependencies (CWE-1395, OWASP A06).**
  Lockfiles, dependency review, malware checks, Dependabot and fix deadlines,
  described above.
- **Download of code without an integrity check (CWE-494).**
  Lockfiles pin npm packages with integrity hashes,
  actions are pinned to full commit SHAs,
  and releases carry Sigstore-signed provenance.
- **Hard-coded credentials (CWE-798).**
  The repository stores no secrets;
  secret scanning and push protection block a push with a detected secret.
- **Prototype pollution (CWE-1321).**
  Dependencies with known prototype pollution advisories are removed or overridden,
  and dependency review blocks reintroducing them.

## Risks users inherit from the templates

Templates are starting points, not hardened services.
Before deploying one, users should know that:

- **No template authenticates requests.**
  Every HTTP route answers anyone who can reach it.
- **`http-client` is an open proxy.**
  Its routes fetch whatever `http` or `https` URL a request passes in `?url=`,
  so a deployment can be used to reach internal addresses (SSRF).
  Restrict the allowed hosts before exposing it.
- **`http-filesystem-handler-hono` reads and writes any file name it's given.**
  The host's WASI preopen confines it to the mounted `/data` directory,
  but within it there is no access control or size limit on writes.

## Known gaps

- Most packages use npm `overrides` to force a patched `minimatch`
  that their dependencies don't allow yet.
  The overrides should be removed once those dependencies allow the patched version.
- `examples/components/webgpu-tensorflow` commits pre-trained model weights
  as binary files that can't be reviewed.
- The legacy wasmCloud 1.x releases (`washboard-ui@*` and `@wasmcloud/*@*`)
  were cut before releases carried SBOMs or provenance.
  The `washboard-ui` ones attach a `washboard.tar.gz`,
  and have since had an SPDX SBOM generated from the `yarn.lock` at each tag attached,
  but neither carries provenance.
  They're end of life and won't be rebuilt;
  only the `vX.Y.Z` releases carry signed SBOMs.

## Vulnerabilities

- Report a vulnerability as described in the [security policy](SECURITY.md).
- Fixed vulnerabilities are published as
  [GitHub Security Advisories](https://github.com/wasmCloud/typescript/security/advisories)
  in this repository,
  and listed under Security fixes in the notes of the release that fixes them.
- Advisories that don't affect this project are recorded in
  [vex.openvex.json](vex.openvex.json), which each release attaches.
