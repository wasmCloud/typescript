# Architecture

This repository holds TypeScript examples and project templates
for building [wasmCloud](https://github.com/wasmCloud/wasmCloud) components.
It ships no service and no package to a registry.
What it releases is source:
the `vX.Y.Z` tags that `wash new` copies templates from,
and a signed source tarball of each tag.

This document covers who and what acts on the repository,
how a change becomes a release,
and the external interfaces of each released template.
The wasmCloud host that runs the components is covered by wasmCloud's own
[threat model](https://github.com/wasmCloud/wasmCloud/blob/main/THREAT_MODEL.md).

## Actors

- **Contributors** open pull requests, usually from forks.
  Every commit must be signed off (DCO).
- **Maintainers**, listed in [MAINTAINERS.md](MAINTAINERS.md),
  review and merge pull requests, triage issues and manage the repository settings.
  Code owners for each path are in [CODEOWNERS](.github/CODEOWNERS).
- **Dependabot** opens pull requests for dependency and GitHub Actions updates.
  They're reviewed and merged like any other pull request.
- **GitHub Actions workflows** in [.github/workflows](.github/workflows)
  build, test, scan and release the repository.
  Each job's token gets only the permissions that job asks for.
- **wasmCloud's release workflow**,
  `release-tag.yml` in wasmCloud/wasmCloud on `main`,
  starts a release here after each stable wasmCloud release.
  An [octo-sts trust policy](.github/chainguard/wasmcloud-release-dispatch.sts.yaml)
  lets only that workflow send the `wasmcloud-release` dispatch.
- **Users** copy a template into a new project with `wash new`,
  then build and run it with `wash` and a wasmCloud host.

## Actions

### Changing the repository

1. A contributor opens a pull request against `main`.
2. CI runs on the pull request:
   - **Examples** builds the examples that changed, and tests most of them under `wash dev` or jco.
   - **Templates** builds every template and smoke-tests the HTTP ones under `wash dev`.
   - **CodeQL** analyzes the TypeScript, JavaScript and workflow sources.
   - **zizmor** audits the workflows.
   - **Lint** runs ESLint and a Prettier check on the examples, templates and scripts.
   - **Dependency review** blocks dependency versions with known vulnerabilities or malware.
   - **DCO** checks that every commit is signed off.
3. A maintainer who didn't push the last commit approves it,
   including a code owner for each changed path.
4. The `main` ruleset requires the checks to pass and allows rebase merges only.
   It blocks force pushes and deletion of `main`,
   and blocks merging a change that adds a high or critical CodeQL alert.

### Releasing

[release.yml](.github/workflows/release.yml) runs on the wasmCloud dispatch,
or by hand on `main`:

1. Checks that the version is `X.Y.Z` and that `vX.Y.Z` doesn't exist yet.
2. Packs the commit with `git archive` into a reproducible source tarball.
3. Generates an SPDX SBOM of the tarball's dependencies with Syft,
   copies the [VEX document](vex.openvex.json), and writes `wasmcloud-typescript-vX.Y.Z.SHA256SUMS`.
4. Attests SLSA build provenance and the SBOM with Sigstore.
5. Creates the `vX.Y.Z` tag and a GitHub Release with the assets and generated notes.

The README describes how to
[verify a release](README.md#versioned-releases).

### Using a template

1. `wash new https://github.com/wasmCloud/typescript.git --subfolder templates/<name> --git-ref vX.Y.Z`
   copies the template at that tag into a new directory.
2. `npm install` installs its dependencies from npm, at the versions in its `package-lock.json`.
3. `npm run build` fetches the WIT dependencies with `wash wit fetch`,
   compiles the TypeScript and packs it into a WebAssembly component with jco.
4. `wash dev`, or a wasmCloud host, runs the component
   and provides the interfaces it imports.

From step 1 on, the project belongs to the user;
fixes reach it only if they copy a newer release.

## External interfaces

Templates have no interfaces beyond the [WIT](https://component-model.bytecodealliance.org/design/wit.html)
interfaces their components import and export.
Each template's README documents them, and its `wit/world.wit` declares them.

| Template | Exports | Imports |
| --- | --- | --- |
| [http-hello-world-fetch](templates/http-hello-world-fetch/) | `wasi:http/incoming-handler@0.2.3` | |
| [http-hello-world-hono](templates/http-hello-world-hono/) | `wasi:http/incoming-handler@0.2.6` | |
| [http-handler-hono](templates/http-handler-hono/) | `wasi:http/incoming-handler@0.2.6` | |
| [http-client](templates/http-client/) | `wasi:http/incoming-handler@0.2.3` | `wasi:http/outgoing-handler@0.2.3` |
| [http-kv-handler-hono](templates/http-kv-handler-hono/) | `wasi:http/incoming-handler@0.2.6` | `wasi:keyvalue/store`, `wasi:keyvalue/atomics` (`0.2.0-draft`) |
| [http-blobstore-handler-hono](templates/http-blobstore-handler-hono/) | `wasi:http/incoming-handler@0.2.6` | `wasi:blobstore/blobstore@0.2.0-draft` |
| [http-filesystem-handler-hono](templates/http-filesystem-handler-hono/) | `wasi:http/incoming-handler@0.2.6` | `wasi:filesystem/types`, `wasi:filesystem/preopens` (`0.2.2`) |
| [http-logging-handler-hono](templates/http-logging-handler-hono/) | `wasi:http/incoming-handler@0.2.6` | `wasi:logging/logging@0.1.0-draft` |
| [http-api-with-distributed-workloads](templates/http-api-with-distributed-workloads/): `http-api` | `wasi:http/incoming-handler@0.2.6` | `wasmcloud:messaging/consumer@0.2.0` |
| [http-api-with-distributed-workloads](templates/http-api-with-distributed-workloads/): `task-leet`, `task-reverse` | `wasmcloud:messaging/handler@0.2.0` | `wasmcloud:messaging/consumer@0.2.0`, `wasi:config/store@0.2.0-rc.1` |
| [service-tcp-echo](templates/service-tcp-echo/): `service` | `wasi:cli/run@0.2.0` | `wasi:sockets` TCP (`0.2.3`), `wasi:io/poll@0.2.0` |
| [service-tcp-echo](templates/service-tcp-echo/): `component` | `wasi:http/incoming-handler@0.2.6` | `wasi:sockets` TCP (`0.2.3`), `wasi:io/poll@0.2.0` |

- **HTTP**: `wash dev` serves components that export `wasi:http/incoming-handler`
  on `127.0.0.1:8000`.
  The routes each one answers are in its README.
- **Outgoing HTTP**: only `http-client` makes outgoing requests,
  to the URLs its routes are given.
- **TCP**: the `service-tcp-echo` service listens on `127.0.0.1:7878`;
  its component connects to it over loopback.
- **Messaging**: `http-api-with-distributed-workloads` sends and receives messages
  through the host's messaging plugin, which uses NATS in production.

The examples in [examples/components](examples/components/)
declare their interfaces the same way, in each example's `wit/` directory and README.
