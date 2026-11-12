// An in-memory `wasi:config/store`.
// Tests fill `values` with the config the host would provide.
export const values = new Map<string, string>();

export function get(key: string): string | undefined {
  return values.get(key);
}

export function getAll(): [string, string][] {
  return [...values.entries()];
}
