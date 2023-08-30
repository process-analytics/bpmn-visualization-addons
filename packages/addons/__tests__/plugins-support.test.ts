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

import { expect, test } from '@jest/globals';
import { BpmnVisualization } from '../src';
//
// test('is failing', () => {
//   expect({ props: 'value' }).toEqual({
//     align: 'left',
//     cursor: 'custom',
//     offset: 20,
//     tooltip: 'my tooltip',
//     verticalAlign: 'middle',
//   });
// });

test('is OK', () => {
  expect({ props: 'value', props2: 12 }).toEqual({
    props2: 12,
    props: 'value',
  });
});

test('No errors when no plugins is set', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null! });
  expect(bpmnVisualization.getPlugin('unknown')).toBeUndefined();
});

// TODO test to add plugins with the same ids several times

// test('Add OverlayPlugin', () => {
//     new BpmnVisualization({})
//
// });
