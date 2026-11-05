// Helpers for the scripts that GitHub Actions workflows run.

import { appendFile } from 'node:fs/promises';

/** Returns a required environment variable, or throws if it isn't set. */
export function env(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/** Calls the GitHub REST API with GH_TOKEN and returns the JSON body. */
export async function api(path, { method = 'GET', params = {}, body } = {}) {
  const url = new URL(path, process.env.GITHUB_API_URL ?? 'https://api.github.com');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env('GH_TOKEN')}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${url.pathname}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/** Sets a step output, or prints it when not running in Actions. */
export async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  } else {
    console.log(`${name}=${value}`);
  }
}

/** Runs a script's main(), reporting a thrown error as a workflow error. */
export function run(main) {
  main().catch((err) => {
    console.log(`::error::${err.message}`);
    process.exitCode = 1;
  });
}
