// Smoke-tests a running example or template, retrying until every check
// passes in the same attempt.
//
// Env:
//   CHECKS    JSON array of checks (below).
//   RETRIES   Attempts before giving up, one second apart. Default 60.
//   BASE_URL  Where `wash dev` serves HTTP. Default http://127.0.0.1:8000.
//   LOG_FILE  A log to print when the checks fail, such as wash dev's.
//
// Each check gets a value, then compares it:
//   path, method, body  Request BASE_URL + path; the value is the response body.
//   run                 Run `npm run --silent <run>`; the value is its output.
//   field               Take this dot-separated field of the value, as JSON.
//   decode: base64      Base64-decode the value.
//   equals, startsWith, contains, length (in bytes)

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { env, run } from './lib/actions.mjs';

const exec = promisify(execFile);

async function getValue(check) {
  if (check.run) {
    const { stdout } = await exec('npm', ['run', '--silent', check.run]);
    return stdout;
  }
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:8000';
  const response = await fetch(new URL(check.path ?? '/', baseUrl), {
    method: check.method ?? 'GET',
    body: check.body,
  });
  if (!response.ok) {
    throw new Error(`${check.path ?? '/'} returned ${response.status}`);
  }
  return response.text();
}

/** Throws if the check fails. */
async function verify(check) {
  let value = (await getValue(check)).replace(/\n+$/, '');
  if (check.field) {
    value = check.field.split('.').reduce((obj, key) => obj?.[key], JSON.parse(value));
    value = typeof value === 'string' ? value : JSON.stringify(value);
  }
  let bytes = Buffer.from(value);
  if (check.decode === 'base64') {
    bytes = Buffer.from(value, 'base64');
    value = bytes.toString();
  }
  const failures = [
    'equals' in check &&
      value !== String(check.equals) &&
      `doesn't equal ${JSON.stringify(check.equals)}`,
    'startsWith' in check &&
      !value.startsWith(check.startsWith) &&
      `doesn't start with ${JSON.stringify(check.startsWith)}`,
    'contains' in check &&
      !value.includes(check.contains) &&
      `doesn't contain ${JSON.stringify(check.contains)}`,
    'length' in check &&
      bytes.length !== check.length &&
      `is ${bytes.length} bytes, not ${check.length}`,
  ].filter(Boolean);
  if (failures.length > 0) {
    throw new Error(`${JSON.stringify(value.slice(0, 200))} ${failures.join(', ')}`);
  }
}

async function main() {
  const checks = JSON.parse(env('CHECKS'));
  const retries = Number(process.env.RETRIES ?? 60);
  let errors = [];
  for (let attempt = 1; attempt <= retries; attempt++) {
    const results = await Promise.allSettled(checks.map(verify));
    errors = results.flatMap((r, i) =>
      r.status === 'rejected' ? [`check ${i + 1}: ${r.reason.message}`] : [],
    );
    if (errors.length === 0) {
      console.log(`✅ ${checks.length} checks passed on attempt ${attempt}`);
      return;
    }
    await sleep(1000);
  }
  for (const message of errors) {
    console.log(`::error::${message}`);
  }
  if (process.env.LOG_FILE) {
    console.log(`--- ${process.env.LOG_FILE}`);
    console.log(await readFile(process.env.LOG_FILE, 'utf8').catch((err) => err.message));
  }
  throw new Error(`checks failed after ${retries} attempts`);
}

run(main);
