module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', '*.d.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // Enforce layer architecture (Section 3.4)
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../features/*'],
            message: 'Features (Layer 7) cannot be imported by other features. Promote shared code to a higher layer.',
          },
        ],
      },
    ],
  },
};
