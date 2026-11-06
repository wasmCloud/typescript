// polyfill.js assigns `navigator`, which QuickJS lacks.
// Node defines a read-only one, so make it assignable as it is there.
Object.defineProperty(globalThis, 'navigator', {
  value: globalThis.navigator,
  writable: true,
  configurable: true,
});
