// Lints the examples, templates and scripts in this repository.
// It's repository tooling: `wash new` copies a template's own directory,
// so projects created from a template don't inherit this config.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/generated/',
      '**/coverage/',
      '**/wit/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Some components dispose WASI resources TypeScript doesn't know are disposable,
      // and whether the generated types declare it depends on the jco version.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      // Unused arguments and caught errors are fine when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Component sources run in a WebAssembly engine (StarlingMonkey or QuickJS)
  // that provides the web platform globals: fetch, Request, Response, crypto, ...
  {
    files: ['**/src/**', '**/*polyfill.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  // Build configs, CI scripts, demos and tests run in Node.
  {
    files: [
      '*.{js,mjs,cjs,ts}',
      'scripts/**',
      '**/scripts/**',
      '**/*.config.{js,mjs,cjs,ts}',
      '**/demo.js',
      '**/test/**',
      '**/*.test.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
);
