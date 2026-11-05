// Checks a release version and sets the outputs the Release workflow uses:
// tag, previous_tag (the newest vX.Y.Z tag below it, for the notes range),
// sha and name.
//
// Env: VERSION, as X.Y.Z.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env, run, setOutput } from './lib/actions.mjs';

const exec = promisify(execFile);
const VERSION_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

async function git(...args) {
  const { stdout } = await exec('git', args);
  return stdout.trim();
}

/** Whether the tag exists on origin. */
async function tagExists(tag) {
  try {
    await exec('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`]);
    return true;
  } catch (err) {
    // --exit-code exits 2 when nothing matches.
    if (err.code === 2) {
      return false;
    }
    throw err;
  }
}

function compareTags(a, b) {
  const [, ...x] = a.match(VERSION_TAG).map(Number);
  const [, ...y] = b.match(VERSION_TAG).map(Number);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

async function main() {
  const version = env('VERSION');
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`version '${version}' is not X.Y.Z`);
  }
  const tag = `v${version}`;
  if (await tagExists(tag)) {
    throw new Error(`${tag} already exists. Tags are immutable; release a new version instead.`);
  }

  // The v1 releases (washboard-ui@*, @wasmcloud/*@*) use other tag names, so
  // they never enter the notes range.
  const older = (await git('tag', '-l', 'v*'))
    .split('\n')
    .filter((t) => VERSION_TAG.test(t) && compareTags(t, tag) < 0)
    .sort(compareTags);

  await setOutput('tag', tag);
  await setOutput('previous_tag', older.at(-1) ?? '');
  await setOutput('sha', await git('rev-parse', 'HEAD'));
  await setOutput('name', `wasmcloud-typescript-${tag}`);
}

run(main);
