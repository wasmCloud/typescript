# Security Policy

This repository follows the wasmCloud
[Security Process and Policy](https://github.com/wasmCloud/wasmCloud/blob/main/SECURITY.md),
which covers how reports are triaged, fixed and disclosed.
This file adds what is specific to this repository.

## Report a vulnerability

Don't report security vulnerabilities as public issues, discussions or pull requests.
Report them privately in either of these ways:

- Email the private security list at **security@wasmcloud.com** with the details.
- Use [GitHub private vulnerability reporting](https://github.com/wasmCloud/typescript/security/advisories/new)
  from this repository's **Security** tab.

Reports go to the wasmCloud security team, a subset of the org maintainers.
Each report is acknowledged within **3 business days**.

Fixed vulnerabilities are published as
[GitHub Security Advisories](https://github.com/wasmCloud/typescript/security/advisories)
in this repository,
and listed under Security fixes in the notes of the release that fixes them.

## Supported versions

Only the latest `vX.Y.Z` release and `main` receive security fixes.
The wasmCloud 1.x packages released from the `v1` branch are end of life.
See [SUPPORT.md](SUPPORT.md).

## Secrets and credentials

The repository stores no secrets,
and its workflows use no secrets beyond the job's own `GITHUB_TOKEN`:

- Each workflow starts from `permissions: {}`,
  and each job is granted only the permissions it needs.
- Checkouts set `persist-credentials: false`,
  so the token isn't left in the workspace for later steps.
- The release job signs with a short-lived OIDC token through Sigstore,
  so there is no long-lived signing key to manage or rotate.
- Secret scanning and push protection are on,
  so a push with a detected secret is blocked.

A workflow that needs a new secret must read it from a GitHub Actions secret,
passed only to the step that uses it,
and the pull request that adds it must say why it's needed.
Never commit a secret, token or key to the repository, including in examples and templates.

If a secret is exposed, report it as a vulnerability.
Maintainers revoke and rotate it right away,
then check its use in the audit log and the workflow runs.
