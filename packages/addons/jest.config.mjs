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

import { pathsToModuleNameMapper } from "ts-jest";
import tsconfigJson from './tsconfig.test.json' assert { type: 'json' };
//const tsconfigJson = require('./tsconfig.test.json');

/*function manageKey(key) {
  return key.includes('(.*)') ? key.slice(0, -1) + '\\.js$' : key;
}
function manageMapper(mapper) {
  const newMapper = {};
  for (const key in mapper) {
    newMapper[manageKey(key)] = mapper[key];
  }
  newMapper['^(.*).js$'] = '$1';
  return newMapper;
}*/



/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  /*  //preset: 'ts-jest/presets/default-esm', // or other ESM presets
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },*/

  verbose: true,

  // testEnvironment: 'jsdom', // need to access to the browser objects
  // testEnvironment: 'jest-environment-node',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],

  // transform: {},
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        useESM: true,
      },
    ],
  },

  extensionsToTreatAsEsm: ['.ts'],
  //preset: 'ts-jest/presets/default-esm',
  preset: 'ts-jest',

  // more on this later
  /*  moduleNameMapper: {
    // eg when importing symbol (tslib) use content of the file (path)
    'bpmn-visualization': 'bpmn-visualization/dist/bpmn-visualization.esm.js',
  },*/

  /*  moduleNameMapper: {
    '^bpmn-visualization$': ['<rootDir>/node_modules/bpmn-visualization/dist/bpmn-visualization.esm.js'],
  },*/

  moduleNameMapper: pathsToModuleNameMapper(
    tsconfigJson.compilerOptions.paths,
    { prefix: '<rootDir>/', useESM: true }
  ),

  /*  moduleNameMapper: manageMapper(pathsToModuleNameMapper(tsconfigJson.compilerOptions.paths, { prefix: '<rootDir>/' }) ),
  transformIgnorePatterns: ['<rootDir>/node_modules/']*/
};
