import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['**/.nitro/**', '**/.output/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
        defineEventHandler: 'readonly',
        defineNitroPlugin: 'readonly',
        useRuntimeConfig: 'readonly',
        getRequestHeader: 'readonly',
        getRequestURL: 'readonly',
        getRequestIP: 'readonly',
        getRouterParam: 'readonly',
        getQuery: 'readonly',
        readBody: 'readonly',
        createError: 'readonly',
        setResponseHeader: 'readonly',
        setResponseStatus: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      'no-console': 'off',
    },
  },
  prettierConfig,
];
