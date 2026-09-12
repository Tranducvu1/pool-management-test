const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules', 'dist'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
