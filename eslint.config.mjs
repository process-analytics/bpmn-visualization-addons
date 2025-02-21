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

import { readFileSync } from 'fs';
import path from 'path';

import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import nodePlugin from 'eslint-plugin-n';
import noticePlugin from 'eslint-plugin-notice';
import prettierRecommendedConfig from 'eslint-plugin-prettier/recommended';
import unicornPlugin from 'eslint-plugin-unicorn';
// eslint-disable-next-line import/no-unresolved
import tseslint from 'typescript-eslint';

const jestPackagePath = path.resolve('node_modules', 'jest', 'package.json');
const jestPackage = JSON.parse(readFileSync(jestPackagePath, 'utf8'));

/**
 * @type {import("eslint").Linter.FlatConfig[]}
 */
export default tseslint.config(
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

  {
    plugins: {
      notice: noticePlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
      },
    },
    rules: {
      'notice/notice': ['error', { templateFile: 'config/license-header.js', onNonMatchingHeader: 'replace' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  {
    ...unicornPlugin.configs['flat/recommended'], // https://github.com/sindresorhus/eslint-plugin-unicorn?tab=readme-ov-file#es-module-recommended-1

    rules: {
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            kebabCase: true,
            pascalCase: true,
            snakeCase: true,
          },
        },
      ],
      'unicorn/prefer-keyboard-event-key': 'off', // 'key' doesn't exist in the used ES version
      'unicorn/prefer-module': 'off', // We don't want to change a working configuration
      'unicorn/prefer-string-replace-all': 'off', // String#replaceAll() doesn't exist in the used ES version
      'unicorn/no-new-array': 'off', // In contradiction with unicorn/new-for-builtins: Use `new Array()` instead of `Array()`
      'unicorn/no-null': 'off', // We don't know the impact on mxGraph code
      'unicorn/no-useless-undefined': 'off', // The "undefined" value is useful where we use it and change some mxGraph code
      'unicorn/prefer-global-this': 'off', // We only target the browser, so it is valid to use the window object. In addition, using 'globalThis' require additional changes in the code/configuration to work.
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      'unicorn/numeric-separators-style': 'off', // With ESLint v9, the syntax with underscores is not supported in older versions of JavaScript.
      'unicorn/prefer-optional-catch-binding': 'off', // With ESLint v9, the syntax 'try {} catch {}' is not supported in cjs files (not tested on other JS files).
    },
  },

  {
    extends: [
      // Feature of `typescript-eslint` to extend multiple configs: https://typescript-eslint.io/packages/typescript-eslint/#flat-config-extends
      importPlugin.flatConfigs.recommended,
    ],
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
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
  ...tseslint.configs.disableTypeChecked,
  },

  // typescript
  {
    files: ['**/*.ts', '**/*.cts', '**/*.mts'],
    extends: [
      // Feature of `typescript-eslint` to extend multiple configs: https://typescript-eslint.io/packages/typescript-eslint/#flat-config-extends
      eslint.configs.recommended, // Problem with 'module', 'require', 'console', 'exports', etc. on .js, .cjs, .mjs files
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
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
    extends: [
      nodePlugin.configs['flat/recommended-script'],
    ],
    settings: {
      node: {
        allowModules: ['@process-analytics/bpmn-visualization-addons'],
      },
    },
    rules: {
      'n/file-extension-in-import': ['error', 'always'],
    },
  },


  // test files
  // There is no more cascading and hierarchy configuration files in ESLint v9.
  // All configurations must be in the same file.
  {
    // enable jest rules on test files
    files: ['test/**'],
    extends: [
      // Feature of `typescript-eslint` to extend multiple configs: https://typescript-eslint.io/packages/typescript-eslint/#flat-config-extends
      jestPlugin.configs['flat/recommended'],
      jestPlugin.configs['flat/style'],
    ],
    plugins: {
      jest: jestPlugin,
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
      /* The rule list: https://github.com/jest-community/eslint-plugin-jest#rules */
      'jest/prefer-expect-resolves': 'warn',
      'jest/prefer-spy-on': 'warn',
      'jest/prefer-todo': 'warn',
      /* The rule didn't find the 'expect' in the called methods */
      'jest/expect-expect': 'off',
    },
  },

  {
    files: ['test/**'],
    ...jestDomPlugin.configs['flat/recommended'],
  },

  prettierRecommendedConfig, // Enables eslint-plugin-prettier, eslint-config-prettier and prettier/prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration.
);
