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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { BpmnVisualization, PathResolver } from '../../src';
import { readFileSync } from '../shared/io-utils';

describe('getVisitedEdges', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null! });
  const pathResolver = new PathResolver(bpmnVisualization.bpmnElementsRegistry);

  beforeEach(() => {
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/simple.bpmn'));
  });

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

  test('Passing the same shape ids several times', () => {
    const ids = [
      // shapes
      'Task_1',
      'StartEvent_1',
      // again
      'StartEvent_1',
      'Task_1',
      'Task_1',
    ];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual(['Flow_StartEvent_1_Task_1']);
  });

  test('Using a diagram with wrong incoming and outgoing', () => {
    // In this test, we verify the impact of wrong incoming and outgoing properties in the returned "edge ids"
    // Model: start event  --> task 1 --> task 2 --> task 3 --> task 4 --> end event
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/simple-with-wrong-incoming-and-outgoing.bpmn'));
    const ids = [
      'Task_2',
      'Task_3',
      // The following ids shouldn't be returned once https://github.com/process-analytics/bpmn-visualization-js/issues/2852 is implemented
      'StartEvent_1', // has extra outgoing flow from Task_1 to Task_2
      'EndEvent_1', // // has extra incoming flow from Task_3 to Task_4
    ];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual([
      'Flow_Task_1_Task_2', // from wrong outgoing StartEvent_1
      'Flow_Task_2_Task_3',
      'Flow_Task_3_Task_4', // from wrong incoming EndEvent_1
    ]);
  });

  describe('Detect message flows', () => {
    beforeEach(() => {
      bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/pools-and-message-flows.bpmn'));
    });

    test('From message end event', () => {
      const ids = [
        // in pool 1
        'Task_1_1',
        'EndEvent_Message_1',
        // in pool 2
        'BoundaryEvent_1',
      ];
      ensureElementsExistInModel(ids);
      expect(pathResolver.getVisitedEdges(ids)).toEqual(['Flow_Task_1_1_EndEvent_Message_1', 'MessageFlow_1-2']);
    });

    test('From intermediate throw event', () => {
      const ids = [
        // in pool 2
        'Gateway_1153l1f', // gateway after the intermediate throw message
        'IntermediateEvent_Throw_Message_1',
        // in pool 3
        'IntermediateEvent_Catch_Message_1',
        'Activity_1n685qk', // task 3.1 after the intermediate catch message
      ];
      ensureElementsExistInModel(ids);
      expect(pathResolver.getVisitedEdges(ids)).toEqual([
        'Flow_0i31twf', // sourceRef="IntermediateEvent_Throw_Message_1" targetRef="Gateway_1153l1f"
        'MessageFlow_2-3',
        'Flow_1eb0isl', // sourceRef="IntermediateEvent_Catch_Message_1" targetRef="Activity_1n685qk"
      ]);
    });
  });
});
