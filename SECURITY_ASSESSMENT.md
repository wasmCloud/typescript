# Security self-assessment

Last reviewed: 2026-11-05

This assessment covers the wasmCloud/typescript repository:
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

## Threats and mitigations

### Malicious or mistaken code merged into a template

- Every change goes through a pull request:
  the `main` ruleset blocks direct pushes, force pushes and deletion,
  and admins can bypass it only through a pull request.
- A maintainer who didn't push the last commit must approve,
  including a code owner for each changed path.
- CodeQL analyzes every pull request,
  and a change that adds a high or critical alert can't merge.
- Templates are built, and the HTTP ones smoke-tested, on every pull request that changes them.

### A compromised or vulnerable npm dependency

- Each package commits its `package-lock.json`,
  and CI installs from it with `npm ci`.
- Dependabot opens version updates after a cooldown,
  so a newly published malicious version has time to be caught and pulled.
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

- Examples and templates have no unit tests;
  CI only builds them and smoke-tests most of them.
- Pull requests aren't blocked on vulnerable dependencies;
  Dependabot alerts are handled under the fix deadlines instead.
- Most packages use npm `overrides` to force a patched `minimatch`
  that their dependencies don't allow yet.
  The overrides should be removed once those dependencies allow the patched version.
- `examples/components/webgpu-tensorflow` commits pre-trained model weights
  as binary files that can't be reviewed.

## Vulnerabilities

- Report a vulnerability as described in the wasmCloud
  [security policy](https://github.com/wasmCloud/typescript/security/policy).
- Fixed vulnerabilities are published as
  [GitHub Security Advisories](https://github.com/wasmCloud/typescript/security/advisories)
  in this repository,
  and listed under Security fixes in the notes of the release that fixes them.
