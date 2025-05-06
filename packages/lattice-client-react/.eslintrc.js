export default {
  extends: ['@wasmcloud/eslint-config'],
  parserOptions: {
    tsconfigRootDir: import.meta.dirname,
    project: ['./tsconfig.eslint.json', './tsconfig.json'],
  },
};
