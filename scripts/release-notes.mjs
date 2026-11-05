// Writes the release notes to $RUNNER_TEMP/notes.md: how to use the release
// with `wash new`, how to verify its assets, and a Changelog heading.
// `gh release create --generate-notes` appends the changelog under the
// heading; the first release has none, so it gets a line saying so instead.
//
// Env: GITHUB_REPOSITORY, RUNNER_TEMP, TAG, PREVIOUS_TAG (empty for the first
// release) and NAME (the asset name prefix).

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env, run } from './lib/actions.mjs';

async function main() {
  const repo = env('GITHUB_REPOSITORY');
  const tag = env('TAG');
  const name = env('NAME');
  const verify = `gh attestation verify ${name}.tar.gz --repo ${repo} --signer-workflow ${repo}/.github/workflows/release.yml`;

  const notes = [
    '## Using this release',
    '',
    '```bash',
    `wash new https://github.com/${repo}.git --name my-project --subfolder templates/<template-name> --git-ref ${tag}`,
    '```',
    '',
    '## Verifying this release',
    '',
    `\`${name}.tar.gz\` is the source of this tag, packed with \`git archive\`. \`${name}.spdx.json\` is its SPDX SBOM.`,
    `\`${name}.openvex.json\` is the OpenVEX document of advisories that don't affect this release.`,
    `All three carry Sigstore-signed SLSA build provenance, and \`${name}.SHA256SUMS\` lists their SHA-256 digests.`,
    '',
    '```bash',
    verify,
    `${verify} --predicate-type https://spdx.dev/Document/v2.3`,
    `sha256sum --check ${name}.SHA256SUMS`,
    '```',
    '',
    '## Changelog',
    '',
  ];
  if (!process.env.PREVIOUS_TAG) {
    notes.push(
      'First versioned release of the TypeScript examples and templates for wasmCloud 2.x.',
      `Earlier changes are in the [commit history](https://github.com/${repo}/commits/${tag}).`,
      '',
    );
  }

  await writeFile(join(env('RUNNER_TEMP'), 'notes.md'), notes.join('\n'));
  console.log(notes.join('\n'));
}

run(main);
