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

import { describe, expect, test } from '@jest/globals';
import { BpmnVisualization, PathResolver } from '../../src';
import { readFileSync } from '../shared/io-utils';

describe('getVisitedEdges', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null! });
  bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/simple.bpmn'));
  const pathResolver = new PathResolver(bpmnVisualization.bpmnElementsRegistry);

  const ensureElementsExistInModel = (ids: string[]): void => {
    expect(bpmnVisualization.bpmnElementsRegistry.getModelElementsByIds(ids)).toHaveLength(ids.length);
  };

  test('Passing a single flow node id', () => {
    const ids = ['Task_2_1'];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual([]);
  });

  test('Passing an empty array', () => {
    expect(pathResolver.getVisitedEdges([])).toEqual([]);
  });

  test('Passing flow node ids', () => {
    const ids = [
      // some are connected
      'Gateway_1',
      'Task_2_2',
      'IntermediateEvent_1',
      'Gateway_2',
      // others not connected
      'StartEvent_1',
      'EndEvent_1',
    ];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual(['Flow_Gateway_1_Task_2_2', 'Flow_Task_2_2_IntermediateEvent_1', 'Flow_IntermediateEvent_1_Gateway_2']);
  });

  test('Passing shape and edge ids', () => {
    const ids = [
      // shapes
      'Task_1',
      'StartEvent_1',
      // edges
      'Flow_Task_2_2_IntermediateEvent_1',
    ];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual(['Flow_StartEvent_1_Task_1']);
  });

  test('Passing edge ids only', () => {
    const ids = ['Flow_StartEvent_1_Task_1', 'Flow_12pv067'];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual([]);
  });
});
