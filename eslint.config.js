// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import convexPlugin from '@convex-dev/eslint-plugin'

export default [
  // Global ignores - these files/folders won't be linted at all
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vinxi/**',
      '**/.output/**',

      // Convex generated files
      '**/convex/_generated/**',

      // TanStack Router generated files
      '**/*.gen.ts',
      '**/routeTree.gen.ts',
    ],
  },

  // TanStack config (includes TypeScript, React, etc.)
  ...tanstackConfig,

  // Convex recommended config (includes plugin and rules for convex/**/*.ts)
  ...convexPlugin.configs.recommended,

  // Project-specific overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow empty object types (common in React component props)
      '@typescript-eslint/no-empty-object-type': 'off',

      // Relax some strict rules for better DX
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
]
