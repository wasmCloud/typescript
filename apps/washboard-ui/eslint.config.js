import {defineConfig} from 'eslint/config';

import wasmCloud from '@wasmcloud/eslint-config';

export default defineConfig([
  wasmCloud,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.eslint.json', './tsconfig.json'],
      },
    },
  },
  {
    files: ['**/*.spec.ts?(x)', '**/*.fixture.ts?(x)', '**/*.test.ts?(x)'],
    rules: {
      // the 'use' function is not a react hook
      'react-hooks/rules-of-hooks': 'off',
      // playwright Locators do not have the dataset property
      'unicorn/prefer-dom-node-dataset': 'off',
    },
  },
]);
