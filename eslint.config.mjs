/*
Copyright 2025 Bonitasoft S.A.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { readFileSync } from 'node:fs';
import path from 'node:path';

import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import nodePlugin from 'eslint-plugin-n';
import noticePlugin from 'eslint-plugin-notice';
import prettierRecommendedConfig from 'eslint-plugin-prettier/recommended';
import unicornPlugin from 'eslint-plugin-unicorn';
// eslint-disable-next-line import/no-unresolved
import tsEslint from 'typescript-eslint';

const jestPackagePath = path.resolve('node_modules', 'jest', 'package.json');
const jestPackage = JSON.parse(readFileSync(jestPackagePath, 'utf8'));

export default tsEslint.config(
  {
    // Need to be in first before any other configuration
    // https://eslint.org/docs/latest/use/configure/ignore
    ignores: [
      '.github/*',
      '.idea/*',
      // at project root, this directory includes a js template file used to add a license header with eslint in all files. It doesn't match the license rule because it is the template!
      'config/*',
      '**/coverage/*',
      '**/dist/*',
      '**/lib/*',
      '**/node_modules/*',
    ],
  },

  eslint.configs.recommended,

  {
    plugins: {
      notice: noticePlugin,
    },
    rules: {
      'notice/notice': ['error', { templateFile: 'config/license-header.js', onNonMatchingHeader: 'replace' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  unicornPlugin.configs['flat/recommended'], // https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config

  importPlugin.flatConfigs.recommended,
  {
    rules: {
      // as defined in `bpmn-visualization` b122995c
      'import/newline-after-import': ['error', { count: 1 }],
      'import/first': 'error',
      'import/order': [
        'error',
        {
          groups: ['type', 'builtin', 'external', 'parent', 'sibling', 'index', 'internal'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  // disable type-aware linting on JS files
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tsEslint.configs.disableTypeChecked,
    languageOptions: {
      ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
      sourceType: 'module', // Allows for the use of imports
    },
  },

  // typescript
  tsEslint.configs.recommended,
  tsEslint.configs.stylistic,

  /** @type {import('@typescript-eslint').ConfigWithExtends} */
  {
    files: ['**/*.{ts,cts,mts}'],
    ...importPlugin.flatConfigs.typescript,
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
          project: '**/tsconfig.json',
        },
      },
    },
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        // This setting is required if you want to use rules which require type information
        // https://typescript-eslint.io/packages/parser/#project
        project: ['./packages/**/tsconfig.json', './tsconfig.eslint.json'],
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error'],
    },
  },

  // node plugin
  {
    ...nodePlugin.configs['flat/recommended-script'],
    settings: {
      node: {
        allowModules: ['@process-analytics/bpmn-visualization-addons'],
      },
    },
    rules: {
      'n/file-extension-in-import': ['error', 'always'],
    },
  },

  // for test files
  {
    files: ['**/test/**/*'],
    ...jestPlugin.configs['flat/recommended'],
    ...jestPlugin.configs['flat/style'],
    ...jestDomPlugin.configs['flat/recommended'],
    plugins: {
      jest: jestPlugin,
      'jest-dom': jestDomPlugin,
    },
    languageOptions: {
      globals: jestPlugin.environments.globals.globals,
    },
    settings: {
      jest: {
        version: jestPackage.version,
      },
    },
    rules: {
      ...jestPlugin.configs['flat/recommended'].rules,
      ...jestPlugin.configs['flat/style'].rules,
      ...jestDomPlugin.configs['flat/recommended'].rules,
      /* The rule list: https://github.com/jest-community/eslint-plugin-jest#rules */
      'jest/prefer-expect-resolves': 'warn',
      'jest/prefer-spy-on': 'warn',
      'jest/prefer-todo': 'warn',
    },
  },

  prettierRecommendedConfig, // Enables eslint-plugin-prettier, eslint-config-prettier and prettier/prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration.
);
