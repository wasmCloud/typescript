/**
 * Node.js ESM loader hook that stubs WASI/wasmCloud interfaces not covered
 * by @bytecodealliance/preview2-shim (e.g. wasi:logging, wasi:config,
 * wasmcloud:secrets).
 *
 * Used by jco serve via JCO_RUN_ARGS so the server child process can load
 * transpiled components that import these interfaces without crashing with
 * ERR_UNSUPPORTED_ESM_URL_SCHEME.
 *
 * Interfaces already handled by preview2-shim are passed through unchanged.
 */

const PREVIEW2_SHIM_PREFIXES = [
  'wasi:clocks/',
  'wasi:cli/',
  'wasi:filesystem/',
  'wasi:http/',
  'wasi:io/',
  'wasi:random/',
  'wasi:sockets/',
];

// Minimal no-op stubs covering known unmapped interface exports:
//   wasi:logging/logging        -> log()
//   wasi:config/runtime         -> get(), getAll()
//   wasmcloud:secrets/store     -> get(), Secret
//   wasmcloud:secrets/reveal    -> reveal()
const STUB_SOURCE = encodeURIComponent(
  'export function log(){}' +
    'export function get(){return null;}' +
    'export function getAll(){return[];}' +
    'export function reveal(){return{tag:"string",val:""};}' +
    'export class Secret{}',
);

export async function resolve(specifier, context, nextResolve) {
  const needsStub =
    (specifier.startsWith('wasi:') || specifier.startsWith('wasmcloud:')) &&
    !PREVIEW2_SHIM_PREFIXES.some((p) => specifier.startsWith(p));

  if (needsStub) {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${STUB_SOURCE}`,
    };
  }

  return nextResolve(specifier, context);
}
