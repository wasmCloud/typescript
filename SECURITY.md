# Security Policy

This policy covers the wasmCloud TypeScript repository:
its examples and templates, its CI and its releases.
It describes how to report a vulnerability,
how reports are handled and disclosed,
and how dependencies, scanning results and credentials are managed.

- [Report a Vulnerability](#report-a-vulnerability)
  - [When to Send a Report](#when-to-send-a-report)
  - [When Not to Send a Report](#when-not-to-send-a-report)
  - [Security Vulnerability Response](#security-vulnerability-response)
  - [Public Disclosure](#public-disclosure)
- [Security Team](#security-team)
  - [Responsibilities](#responsibilities)
  - [Membership](#membership)
- [Patch and Release Team](#patch-and-release-team)
- [Disclosures](#disclosures)
- [Supported Versions](#supported-versions)
- [Dependency and Code Scanning](#dependency-and-code-scanning)
- [Vulnerability Exploitability Exchange (VEX)](#vulnerability-exploitability-exchange-vex)
- [Secrets and Credentials](#secrets-and-credentials)

## Report a Vulnerability

CRA stewardship: This project is supported under the Linux Foundation CRA stewardship framework,
as described at https://www.linuxfoundation.org/security.
Security vulnerabilities should be reported through the mechanisms described below,
which we will coordinate with our CRA steward.
For actively exploited vulnerabilities and severe incidents that may require CRA escalation,
please use the project's emergency security reporting mechanisms as appropriate.

We are grateful to the security researchers and users who report vulnerabilities.
Every report is investigated by wasmCloud maintainers.

Don't report security vulnerabilities as public issues, discussions or pull requests.
Report them privately in either of these ways:

- Email the private security list at **security@wasmcloud.com** with the details.
- Use [GitHub private vulnerability reporting](https://github.com/wasmCloud/typescript/security/advisories/new)
  from this repository's **Security** tab.

Reports go to the [security team](#security-team).

### When to Send a Report

You believe you have found a vulnerability in this repository, including:

- the code, configuration or lockfile of an example or template,
  which `wash new` copies into new projects
- a dependency of an example or template
- a GitHub Actions workflow, or a way to change what it builds, signs or releases
- a release asset, tag or attestation

The [security self-assessment](SECURITY_ASSESSMENT.md) describes the threat model:
what is at stake, the attack surface, and the risks the templates knowingly leave to users.

### When Not to Send a Report

- A vulnerability in a project you created from a template
  that comes from changes made after it was created.
  Report it to that project's owner.
- A risk the [security self-assessment](SECURITY_ASSESSMENT.md#risks-users-inherit-from-the-templates)
  already lists, such as templates that don't authenticate requests.
  These are documented starting points; open an issue if the documentation is unclear.
- Guidance on securing a wasmCloud deployment.
  See the [documentation](https://wasmcloud.com/docs) or ask in [Slack](https://slack.wasmcloud.com).
- Help applying security updates to your own project.

A vulnerability in the wasmCloud host, `wash` or another wasmCloud project
is reported the same way, through security@wasmcloud.com
or that project's **Security** tab.

### Security Vulnerability Response

Each report is acknowledged within **3 business days**.
This begins the security review described below.

Vulnerability information shared with the security team stays within the wasmCloud project.
It is shared with others only when that's necessary to fix the issue
or to escalate it to the CRA steward,
and then only on a need-to-know basis.

We ask that reporters act in good faith by not disclosing the issue to others.
We strive to act in good faith by responding swiftly
and by crediting reporters in writing, with their permission.

The reporter is kept informed as the issue moves through triage, the fix and the release,
and may be asked further questions along the way.

### Public Disclosure

A vulnerability is disclosed publicly alongside the release that fixes it.
We aim to disclose fully once a fix or mitigation is available,
on a timetable that works well for users.

CVEs are assigned to vulnerabilities.
Obtaining a CVE ID takes time,
so a disclosure may be published before its ID is assigned
and updated once the ID is available.

If the reporter would like to be credited in the disclosure, we are happy to do so.
We ask for permission and for how the reporter would like to be identified.

## Security Team

The security team is a subset of active wasmCloud maintainers
who are willing and able to respond to vulnerability reports.

### Responsibilities

- Members **MUST** be active maintainers of active wasmCloud projects.
- Members **SHOULD** engage with each reported vulnerability,
  at a minimum to ensure it is being handled.
- Members **MUST** keep vulnerability details private and share them only on a need-to-know basis.

### Membership

New members must be active wasmCloud maintainers willing to fulfill the responsibilities above.
Maintainers may join at any time by contacting the org maintainers,
and members may step down at any time.

A member who is no longer an active maintainer of an active wasmCloud project
is removed from the team.

## Patch and Release Team

When a vulnerability is acknowledged,
a team that includes [maintainers](MAINTAINERS.md) of this repository
is assembled to fix it, release the fix and publish the disclosure.
The team may grow beyond the security team as needed,
but stays within the pool of active wasmCloud maintainers.

The fix is developed in a private fork from the advisory,
merged to `main` through the usual review,
and released as a new `vX.Y.Z` release.

## Disclosures

Vulnerabilities are disclosed as
[GitHub Security Advisories](https://github.com/wasmCloud/typescript/security/advisories)
in this repository.
Each disclosure contains:

- an overview of the vulnerability
- the affected examples or templates, and the affected releases
- the fix, usually a new release, and how to apply it to a project created from an affected release
- a workaround, if one is available

Disclosures are published on the same day as the fixing release, after the release is published.
The pull request that fixes the vulnerability is labeled `security`,
so the release notes list it under Security fixes,
and the notes link to the advisory.

This repository has no published advisories yet.

Advisories that don't affect this project are recorded in [vex.openvex.json](vex.openvex.json),
which every release attaches with signed provenance.
See [Vulnerability Exploitability Exchange (VEX)](#vulnerability-exploitability-exchange-vex).

## Supported Versions

Security fixes land on `main` and ship in the next `vX.Y.Z` release.
Only the latest release receives them;
there are no release branches and no backports.
`main` can be used with `wash new` directly, and carries fixes before they're released.

The wasmCloud 1.x packages released from the `v1` branch
(`washboard-ui`, `@wasmcloud/lattice-client-core`, `@wasmcloud/lattice-client-react`
and `@wasmcloud/eslint-config`) are end of life and receive no fixes.
See [SUPPORT.md](SUPPORT.md) for the full support policy.

## Dependency and Code Scanning

This policy covers everything a release ships:
every example and template, with its `package-lock.json`,
and the workflows that build and release them.

Findings come from:

- [Dependency review](.github/workflows/dependency-review.yml),
  which checks every pull request against the GitHub Advisory Database.
  A pull request that adds or updates a dependency to a vulnerable version, of any severity,
  is blocked until it uses a fixed version.
  One that adds an npm package version listed as malware is blocked outright.
- Dependabot alerts and security updates for every `package-lock.json`,
  and version updates for npm and GitHub Actions.
- [CodeQL](.github/workflows/codeql.yml) analysis of the TypeScript and JavaScript sources
  and the workflows, with the `security-extended` queries,
  on every pull request, on pushes to `main` and weekly.
- [zizmor](.github/workflows/zizmor.yml) analysis of the workflows,
  on every pull request, on pushes to `main` and weekly.

Results appear in the repository's **Security** tab.

### Vulnerabilities

A vulnerability in a dependency, or a code scanning alert, is fixed on `main`,
or dismissed with a stated reason,
on this timeline by its severity:

| Severity | Fixed on `main` within |
| -------- | ---------------------- |
| Critical | 7 days                 |
| High     | 14 days                |
| Medium   | 90 days                |
| Low      | Best effort            |

The fix ships in the next release.
An advisory that doesn't affect this project can be dismissed,
or allowed in dependency review with `allow-ghsas`,
once its [VEX statement](#vulnerability-exploitability-exchange-vex) is merged.
The dismissal or allowance links to that statement.

### Licenses

Every dependency must use an [OSI-approved](https://opensource.org/licenses) license
compatible with Apache-2.0.
A dependency under any other license must be removed or replaced before the next release.

### Code scanning

A pull request that adds a high or critical severity CodeQL alert is blocked from merging
until the alert is fixed or dismissed with a stated reason.
zizmor findings appear as code scanning alerts on the pull request,
and are fixed or dismissed on the timeline above.

### Before a release

Critical and high severity vulnerabilities found by dependency review, Dependabot or CodeQL
must be fixed or dismissed before each release.
Maintainers review the VEX document against the open and dismissed alerts before each release.

## Vulnerability Exploitability Exchange (VEX)

Every known vulnerability assessed as not affecting this project
must be recorded in the public OpenVEX document [vex.openvex.json](vex.openvex.json).
A dismissal or an `allow-ghsas` entry alone is not an assessment.

Each statement is reviewed in a pull request by maintainers of this repository.
It identifies:

- the advisory, by its GHSA or CVE ID
- the affected examples or templates, as package URLs
- the `not_affected` status
- an [OpenVEX justification](https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md#status-justifications)
- an impact statement saying why the vulnerability can't be exploited here

Statements are reassessed when dependencies, code paths or upstream advisories change,
and before every release.
A finding that hasn't been confirmed as not affecting this project stays open as under investigation.
If an assessment no longer holds,
update its status, reopen the alert or remove the `allow-ghsas` entry,
and follow the vulnerability timeline and disclosure process above.

Each revision increments the document's `version` and updates its `timestamp`.
Every release attaches the document as `wasmcloud-typescript-vX.Y.Z.openvex.json`,
so past releases keep the assessments made for them.

## Secrets and Credentials

This policy covers the credentials this repository's workflows use.

### Prefer no stored secret

Use a short-lived credential whenever the service supports one:

- Release signing and provenance use Sigstore keyless signing
  with the workflow's GitHub OIDC identity.
- The OSPS Baseline scan signs and publishes its results with the workflow's OIDC token.
- Everything else uses the job's `GITHUB_TOKEN`.
  The repository default is read-only,
  each workflow starts from `permissions: {}`,
  and each job is granted only the permissions it needs.
- Checkouts set `persist-credentials: false`,
  so the token isn't left in the workspace for later steps.

The repository stores no secrets.

### Stored secrets

When a service offers no short-lived credential, the credential is stored as a GitHub Actions secret:

- Secrets never go in the repository, release assets, build artifacts or logs,
  including in examples and templates.
  Secret scanning and push protection are on,
  so a push with a detected secret is blocked.
- Each secret has the narrowest scope that works:
  this repository, or a deployment environment restricted to `main` for a secret that releases.
  A secret is passed only to the step that uses it.
- Only repository admins and org maintainers can create, update or delete secrets.
  Anyone with write access can run a workflow that reads repository secrets,
  so write access is granted only to wasmCloud maintainer teams.
- The pull request that adds a secret says what it's for and who owns it.
  A secret no workflow uses is deleted.

### Privileged workflows

[release.yml](.github/workflows/release.yml) is the only workflow with write access to the repository
and the only one that signs release assets.
It never runs pull request code:

- It starts from a `wasmcloud-release` repository dispatch, sent when wasmCloud cuts a stable release,
  or from a maintainer's `workflow_dispatch`.
  Its job runs only when the ref is `refs/heads/main`.
- It packs, scans and attests the commit at the head of `main`,
  and executes none of the examples or templates.
- It runs on a GitHub-hosted runner and restores no cache.

The CodeQL, zizmor and OSPS Baseline workflows can also upload scan results,
and the OSPS Baseline scan gets an OIDC token to sign them.
None of them can write to the repository.

### Rotation

A secret is rotated:

- immediately, if it may have been exposed
- when someone who held its value, or a repository admin or org maintainer, loses that access
- at least once a year, for any credential that doesn't expire on its own

If a secret is exposed, report it as a vulnerability.
Maintainers revoke and rotate it right away,
then review its use in the audit log and the workflow runs.
