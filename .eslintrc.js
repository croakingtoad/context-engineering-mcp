module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['prettier'],
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'error'
  },
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', 'external/', 'test-fixtures/']
};