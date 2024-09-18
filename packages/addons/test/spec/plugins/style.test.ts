/*
Copyright 2024 Bonitasoft S.A.

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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { BpmnElementsRegistry } from 'bpmn-visualization';

import { BpmnVisualization, StyleByNamePlugin, StylePlugin } from '../../../src/index.js';
import { insertBpmnContainerWithoutId } from '../../shared/dom-utils.js';
import { readFileSync } from '../../shared/io-utils.js';

// jest mock configuration
const mockBvResetStyleByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'resetStyle');
const mockBvUpdateStyleByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'updateStyle');

beforeEach(() => {
  mockBvResetStyleByIds.mockClear();
  mockBvUpdateStyleByIds.mockClear();
});

// The actual implementation is in `bpmn-visualization`. Here, we only validate that the `bpmn-visualization` code is called.
describe('StylePlugin', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [StylePlugin] });
  const stylePlugin = bpmnVisualization.getPlugin<StylePlugin>('style');

  describe('updateStyle', () => {
    test('Pass a single id', () => {
      stylePlugin.updateStyle('Gateway_0t7d2lu', { stroke: { color: 'red' } });

      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith('Gateway_0t7d2lu', { stroke: { color: 'red' } });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      stylePlugin.updateStyle(['Gateway_0t7d2lu', 'Activity_08z13ne'], { stroke: { color: 'red' } });

      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne'], { stroke: { color: 'red' } });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetStyle', () => {
    test('Pass a single id', () => {
      stylePlugin.resetStyle('Gateway_0t7d2lu');

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith('Gateway_0t7d2lu');
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      stylePlugin.resetStyle(['Gateway_0t7d2lu', 'Activity_08z13ne']);

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne']);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass nullish parameter', () => {
      stylePlugin.resetStyle();

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith(undefined);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });
  });
});

// The actual implementation is in `bpmn-visualization`. Here, we only validate that the `bpmn-visualization` code is called.
describe('StyleByNamePlugin', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [StyleByNamePlugin] });
  bpmnVisualization.load(readFileSync('./fixtures/bpmn/search-elements.bpmn'));
  const styleByNamePlugin = bpmnVisualization.getPlugin<StyleByNamePlugin>('style-by-name');

  describe('updateStyle', () => {
    test('Pass a single name related to an existing element', () => {
      styleByNamePlugin.updateStyle('gateway 2', { stroke: { color: 'red' } });

      // 'gateway 2' name is for id 'Gateway_0t7d2lu'
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu'], { stroke: { color: 'red' } });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names related to existing elements', () => {
      styleByNamePlugin.updateStyle(['task 2.2', 'gateway 2'], { fill: { color: 'chartreuse' }, stroke: { width: 2 } });

      // 'task 2.2' name is for id 'Activity_08z13ne'
      // 'gateway 2' name is for id 'Gateway_0t7d2lu'
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith(['Activity_08z13ne', 'Gateway_0t7d2lu'], { fill: { color: 'chartreuse' }, stroke: { width: 2 } });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass an empty array', () => {
      styleByNamePlugin.updateStyle([], { fill: { opacity: 50 } });

      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith([], { fill: { opacity: 50 } });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass a single name NOT related to an existing element', () => {
      styleByNamePlugin.updateStyle('no_exist', { opacity: 30 });

      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith([], { opacity: 30 });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names NOT related to existing elements', () => {
      styleByNamePlugin.updateStyle(['no_exist_1', 'no_exist_2'], { opacity: 30 });

      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith([], { opacity: 30 });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names, some related to existing elements, some NOT related to existing elements', () => {
      styleByNamePlugin.updateStyle(['no_exist_1', 'gateway 1', 'no_exist_2'], { opacity: 30 });

      // 'gateway 1' name is for id 'Gateway_1'
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledWith(['Gateway_1'], { opacity: 30 });
      expect(mockBvUpdateStyleByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetStyle', () => {
    test('Pass a single name related to an existing element', () => {
      styleByNamePlugin.resetStyle('gateway 2');

      // 'gateway 2' name is for id 'Gateway_0t7d2lu'
      expect(mockBvResetStyleByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu']);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names related to existing elements', () => {
      styleByNamePlugin.resetStyle(['task 2.2', 'gateway 2']);

      // 'task 2.2' name is for id 'Activity_08z13ne'
      // 'gateway 2' name is for id 'Gateway_0t7d2lu'
      expect(mockBvResetStyleByIds).toHaveBeenCalledWith(['Activity_08z13ne', 'Gateway_0t7d2lu']);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass an empty array', () => {
      styleByNamePlugin.resetStyle([]);

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith([]);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass a single name NOT related to an existing element', () => {
      styleByNamePlugin.resetStyle('no_exist');

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith([]);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names NOT related to existing elements', () => {
      styleByNamePlugin.resetStyle(['no_exist_1', 'no_exist_2']);

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith([]);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several names, some related to existing elements, some NOT related to existing elements', () => {
      styleByNamePlugin.resetStyle(['no_exist_1', 'gateway 1', 'no_exist_2']);

      // 'gateway 1' name is for id 'Gateway_1'
      expect(mockBvResetStyleByIds).toHaveBeenCalledWith(['Gateway_1']);
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass nullish parameter', () => {
      styleByNamePlugin.resetStyle();

      expect(mockBvResetStyleByIds).toHaveBeenCalledWith();
      expect(mockBvResetStyleByIds).toHaveBeenCalledTimes(1);
    });
  });
});
