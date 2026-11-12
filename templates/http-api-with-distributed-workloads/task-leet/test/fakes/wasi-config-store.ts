// In-memory wasi:config/store.
// Tests set the values the host would supply from .wash/config.yaml,
// or make the store fail as a host error would.

export type ConfigError = { tag: 'upstream'; val: string } | { tag: 'io'; val: string };

const values = new Map<string, string>();
let failure: ConfigError | undefined;

/** Replace the stored values with `entries`. */
export function configure(entries: Record<string, string>): void {
  values.clear();
  for (const [key, value] of Object.entries(entries)) {
    values.set(key, value);
  }
}

/** Make every subsequent read throw `error`. */
export function failWith(error: ConfigError): void {
  failure = error;
}

export function reset(): void {
  values.clear();
  failure = undefined;
}

export function get(key: string): string | undefined {
  if (failure) throw failure;
  return values.get(key);
}

export function getAll(): [string, string][] {
  if (failure) throw failure;
  return [...values.entries()];
}
