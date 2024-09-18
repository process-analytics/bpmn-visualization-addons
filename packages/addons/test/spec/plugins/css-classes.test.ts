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

import { BpmnVisualization, CssClassesPlugin } from '../../../src/index.js';
import { insertBpmnContainerWithoutId } from '../../shared/dom-utils.js';

// jest mock configuration
const mockBvAddCssClassesByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'addCssClasses');
const mockBvRemoveCssClassesByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'removeCssClasses');
const mockBvRemoveAllCssClassesByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'removeAllCssClasses');
const mockBvToggleCssClassesByIds = jest.spyOn(BpmnElementsRegistry.prototype, 'toggleCssClasses');

beforeEach(() => {
  mockBvAddCssClassesByIds.mockClear();
  mockBvRemoveCssClassesByIds.mockClear();
  mockBvRemoveAllCssClassesByIds.mockClear();
  mockBvToggleCssClassesByIds.mockClear();
});

// The actual implementation is in `bpmn-visualization`. Here, we only validate that the `bpmn-visualization` code is called.
describe('CssClassesPlugin', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [CssClassesPlugin] });
  const cssClassesPlugin = bpmnVisualization.getPlugin<CssClassesPlugin>('css');

  describe('addCssClasses', () => {
    test('Pass a single id', () => {
      cssClassesPlugin.addCssClasses('Gateway_0t7d2lu', ['class-1', 'class-2']);

      expect(mockBvAddCssClassesByIds).toHaveBeenCalledWith('Gateway_0t7d2lu', ['class-1', 'class-2']);
      expect(mockBvAddCssClassesByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      cssClassesPlugin.addCssClasses(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');

      expect(mockBvAddCssClassesByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');
      expect(mockBvAddCssClassesByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeCssClasses', () => {
    test('Pass a single id', () => {
      cssClassesPlugin.removeCssClasses('Gateway_0t7d2lu', ['class-1', 'class-2']);

      expect(mockBvRemoveCssClassesByIds).toHaveBeenCalledWith('Gateway_0t7d2lu', ['class-1', 'class-2']);
      expect(mockBvRemoveCssClassesByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      cssClassesPlugin.removeCssClasses(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');

      expect(mockBvRemoveCssClassesByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');
      expect(mockBvRemoveCssClassesByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllCssClasses', () => {
    test('Pass a single id', () => {
      cssClassesPlugin.removeAllCssClasses('Gateway_0t7d2lu');

      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledWith('Gateway_0t7d2lu');
      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      cssClassesPlugin.removeAllCssClasses(['Gateway_0t7d2lu', 'Activity_08z13ne']);

      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne']);
      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass no id', () => {
      cssClassesPlugin.removeAllCssClasses();

      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledWith(undefined);
      expect(mockBvRemoveAllCssClassesByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleCssClasses', () => {
    test('Pass a single id', () => {
      cssClassesPlugin.toggleCssClasses('Gateway_0t7d2lu', ['class-1', 'class-2']);

      expect(mockBvToggleCssClassesByIds).toHaveBeenCalledWith('Gateway_0t7d2lu', ['class-1', 'class-2']);
      expect(mockBvToggleCssClassesByIds).toHaveBeenCalledTimes(1);
    });

    test('Pass several ids', () => {
      cssClassesPlugin.toggleCssClasses(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');

      expect(mockBvToggleCssClassesByIds).toHaveBeenCalledWith(['Gateway_0t7d2lu', 'Activity_08z13ne'], 'class');
      expect(mockBvToggleCssClassesByIds).toHaveBeenCalledTimes(1);
    });
  });
});
