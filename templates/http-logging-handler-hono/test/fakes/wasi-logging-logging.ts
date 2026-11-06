// An in-memory wasi:logging/logging that records every call,
// so tests can assert on what was logged.

export type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface Entry {
  level: Level;
  context: string;
  message: string;
}

export const entries: Entry[] = [];

export function log(level: Level, context: string, message: string): void {
  entries.push({ level, context, message });
}
