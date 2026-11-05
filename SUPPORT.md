# Support

## Examples and templates

`main` holds TypeScript examples and project templates for wasmCloud 2.x. They're released as
`vX.Y.Z` [GitHub Releases](https://github.com/wasmCloud/typescript/releases), each a tag on `main`
with a signed source tarball. To pin a template to a release, pass the tag to `wash new`:

```bash
wash new https://github.com/wasmCloud/typescript.git --name my-project --subfolder templates/<template-name> --git-ref v2.12.0
```

- The supported release is the latest `vX.Y.Z` release. It tracks the current wasmCloud 2.x
  release.
- Bug fixes and security fixes, including dependency updates, land on `main` and ship in the next
  release. There are no release branches and no backports: an older `vX.Y.Z` release receives no
  fixes once a newer one is out.
- `main` itself is always usable with `wash new` (leave out `--git-ref`), and may carry fixes that
  haven't been released yet.

The [README](README.md#versioned-releases) describes how to verify a release.

## wasmCloud 1.x packages

The other GitHub releases in this repository were published from the `v1` branch for wasmCloud 1.x:
`washboard-ui`, `@wasmcloud/lattice-client-core`, `@wasmcloud/lattice-client-react` and
`@wasmcloud/eslint-config`. wasmCloud 1.x is
[end of life](https://github.com/wasmCloud/wasmCloud/blob/main/SUPPORT.md#wasmcloud-1x), and these
packages receive no fixes, including security fixes.

## Getting help

- Ask questions in [Slack](https://slack.wasmcloud.com/) or bring them to a
  [community meeting](https://wasmcloud.com/community/).
- Report bugs as [GitHub issues](https://github.com/wasmCloud/typescript/issues).
- Report security vulnerabilities privately, as described in the
  [security policy](https://github.com/wasmCloud/typescript/security/policy).
- Fixed vulnerabilities are published as
  [GitHub Security Advisories](https://github.com/wasmCloud/typescript/security/advisories)
  and listed under Security fixes in the notes of the release that fixes them.

Support is provided by the community on a best-effort basis.
