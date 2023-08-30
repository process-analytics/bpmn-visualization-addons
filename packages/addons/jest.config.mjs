/*
Copyright 2023 Bonitasoft S.A.

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

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  verbose: true,

  testEnvironment: 'jsdom', // need to access to the browser objects
  testMatch: ['**/?(*.)+(spec|test).ts'],

  extensionsToTreatAsEsm: ['.ts'],
  preset: "ts-jest/presets/default-esm",

  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
};
