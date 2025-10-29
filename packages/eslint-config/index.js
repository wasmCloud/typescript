import js from '@eslint/js';
// TODO(lachieh): correct when https://github.com/eslint-community/eslint-plugin-eslint-comments/pull/246 is merged
// @ts-expect-error -- No types available for this package
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import {defineConfig, globalIgnores} from 'eslint/config';
import prettier from 'eslint-config-prettier';
import turbo from 'eslint-config-turbo/flat';
import {flatConfigs as eslintImportX} from 'eslint-plugin-import-x';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import {configs as tsEslintConfigs, parser as tsParser} from 'typescript-eslint';

export default defineConfig([
  unicorn.configs.recommended,
  js.configs.recommended,
  eslintImportX.recommended,
  eslintImportX.typescript,
  tsEslintConfigs.recommended,
  eslintComments.recommended,
  react.configs.flat.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,
  turbo,
  {
    languageOptions: {
      globals: globals.browser,
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json', './tsconfig.eslint.json'],
      },
    },

    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-member-accessibility': ['warn', {accessibility: 'no-public'}],
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: 'never',
          classes: ['field', ['get', 'set'], 'constructor', 'method'],
        },
      ],
      '@typescript-eslint/no-loss-of-precision': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {ignoreRestSiblings: true}],
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', {allowWholeFile: true}],
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
      '@eslint-community/eslint-comments/require-description': 'warn',
      'import-x/no-cycle': ['error', {ignoreExternal: false}],
      'import-x/no-named-as-default-member': 'off',
      'import-x/order': [
        'warn',
        {
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'unknown',
            'type',
            ['object', 'builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: ['builtin', 'object'],
          pathGroups: [
            {
              pattern: '**/*.+(css|sass|scss|less|styl)',
              group: 'unknown',
              patternOptions: {dot: true, nocomment: true},
              position: 'before',
            },
            {
              pattern: '@wasmcloud/**',
              group: 'internal',
              position: 'before',
            },
          ],
          warnOnUnassignedImports: true,
        },
      ],
      'import-x/no-default-export': 'error',
      'no-case-declarations': 'warn',
      'no-console': ['warn', {allow: ['info', 'warn', 'error']}],
      'no-param-reassign': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../', './../../'],
              message: 'Relative imports are not allowed. Please use the @/ alias.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: ':matches(PropertyDefinition, MethodDefinition)[accessibility="private"]',
          message: 'Use #private instead',
        },
      ],
      'no-undef': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-unreachable': 'warn',
      'object-curly-spacing': ['warn', 'never'],
      'react-refresh/only-export-components': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'spaced-comment': ['warn', 'always', {markers: ['/']}],
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            args: false,
            prop: false,
            props: false,
            ref: false,
            refs: false,
          },
        },
      ],
    },

    settings: {
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import-x/resolver': {
        typescript: {alwaysTryTypes: true},
      },
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*@(rc|.config).@(cjs|js|ts)', 'tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'import-x/no-default-export': 'off',
    },
  },
  prettier,
  globalIgnores(['**/node_modules', '**/dist', '**/build', '**/coverage']),
]);
