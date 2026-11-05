// Writes the release notes to $RUNNER_TEMP/notes.md: the generated changelog,
// how to use the release with `wash new`, and how to verify its assets.
//
// Env: GH_TOKEN, GITHUB_REPOSITORY, RUNNER_TEMP, TAG, PREVIOUS_TAG (empty for
// the first release), SHA and NAME (the asset name prefix).

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { api, env, run } from './lib/actions.mjs';

async function changelog(repo, tag, previousTag, sha) {
  if (!previousTag) {
    return [
      'First versioned release of the TypeScript examples and templates for wasmCloud 2.x.',
      `Earlier changes are in the [commit history](https://github.com/${repo}/commits/${tag}).`,
    ].join('\n');
  }
  // Pin the start tag: left to itself GitHub would start from the latest
  // release, which may be a v1-branch package release.
  const notes = await api(`/repos/${repo}/releases/generate-notes`, {
    method: 'POST',
    body: { tag_name: tag, target_commitish: sha, previous_tag_name: previousTag },
  });
  return notes.body;
}

async function main() {
  const repo = env('GITHUB_REPOSITORY');
  const tag = env('TAG');
  const name = env('NAME');
  const verify = `gh attestation verify ${name}.tar.gz --repo ${repo} --signer-workflow ${repo}/.github/workflows/release.yml`;

  const notes = [
    '## Changelog',
    '',
    await changelog(repo, tag, process.env.PREVIOUS_TAG, env('SHA')),
    '',
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
  ].join('\n');

  await writeFile(join(env('RUNNER_TEMP'), 'notes.md'), notes);
  console.log(notes);
}

run(main);
