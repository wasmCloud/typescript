/// <reference path="./wasmcloud-secrets-store.d.ts" />
declare module 'wasmcloud:secrets/reveal@0.1.0-draft' {
  /**
   * Reveals the value of a secret to the caller.
   * This lets you easily audit your code to discover where secrets are being used.
   */
  export function reveal(s: Secret): SecretValue;
  export type Secret = import('wasmcloud:secrets/store@0.1.0-draft').Secret;
  export type SecretValue = import('wasmcloud:secrets/store@0.1.0-draft').SecretValue;
}
