import {defineConfig} from 'eslint/config';

import wasmcloud from '@wasmcloud/eslint-config';

export default defineConfig([
  wasmcloud,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.eslint.json', './tsconfig.json'],
      },
    },
  },
]);
