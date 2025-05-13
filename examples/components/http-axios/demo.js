import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { stat } from "node:fs/promises";
import { exec as execSync } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execSync);

/** Where to find Jco as an executable */
const JCO_PATH = env.JCO_PATH ?? "jco";

/** Path to the WASM file to be used */
const WASM_PATH = fileURLToPath(
  new URL(env.WASM_PATH ?? "./build/http_axios_s.wasm", import.meta.url),
);

async function main() {
  // Determine paths to jco and output wasm
  const wasmPathExists = await stat(WASM_PATH)
    .then((p) => p.isFile())
    .catch(() => false);
  if (!wasmPathExists) {
    throw new Error(
      `Missing/invalid Wasm binary @ [${WASM_PATH}] (has 'npm run build' been run?)`,
    );
  }

  const { stdout } = await exec(`${JCO_PATH} run ${WASM_PATH}`);
  const parsedJson = JSON.parse(stdout);
  process.stdout.write(JSON.stringify(parsedJson.data, null, 2));
}

await main();
