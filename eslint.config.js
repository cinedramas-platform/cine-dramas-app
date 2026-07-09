const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    // Deno edge functions resolve imports via supabase/functions/deno.json
    // import maps — the node resolver can't see them.
    files: ['supabase/functions/**'],
    rules: { 'import/no-unresolved': 'off' },
  },
  {
    files: ['scripts/**', '*.config.js', 'app.config.js'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        console: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
  {
    // .agents/.claude/.github skills are vendored third-party tooling — not ours to lint.
    ignores: [
      'dist/',
      'node_modules/',
      '.expo/',
      'brands/index.js',
      '.agents/',
      '.claude/',
      '.github/skills/',
      'tools/',
      'portal/',
    ],
  },
]);
