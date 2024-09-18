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

import type { BpmnSemantic, EdgeBpmnSemantic, ShapeBpmnSemantic } from 'bpmn-visualization';

import { beforeEach, describe, expect, test } from '@jest/globals';
import { FlowKind, ShapeBpmnElementKind, ShapeBpmnEventDefinitionKind } from 'bpmn-visualization';

import { CasePathResolver, PathResolver } from '../../src/index.js';
import { createNewBpmnVisualizationWithoutContainer } from '../shared/bv-utils.js';
import { readFileSync } from '../shared/io-utils.js';

const bpmnVisualization = createNewBpmnVisualizationWithoutContainer();
const ensureElementsExistInModel = (ids: string[]): void => {
  const uniqueIds = [...new Set(ids)];
  expect(bpmnVisualization.bpmnElementsRegistry.getModelElementsByIds(ids)).toHaveLength(uniqueIds.length);
};

describe('PathResolver', () => {
  const pathResolver = new PathResolver(bpmnVisualization.bpmnElementsRegistry);

  beforeEach(() => {
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/simple.bpmn'));
  });

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
    const ids = ['Flow_StartEvent_1_Task_1', 'Flow_Task_1_Gateway_1'];
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
      // The ids of the incoming/outgoing attributes are wrong in the following elements. They shouldn't be returned (see https://github.com/process-analytics/bpmn-visualization-js/issues/2852)
      'StartEvent_1', // has extra outgoing flow from Task_1 to Task_2
      'EndEvent_1', // // has extra incoming flow from Task_3 to Task_4
    ];
    ensureElementsExistInModel(ids);
    expect(pathResolver.getVisitedEdges(ids)).toEqual(['Flow_Task_2_Task_3']);
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

const mapToIds = (elements: BpmnSemantic[]): string[] => elements.map(element => element.id);

describe('CasePathResolver', () => {
  const pathResolver = new CasePathResolver(bpmnVisualization.bpmnElementsRegistry);

  beforeEach(() => {
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/paths/simple.bpmn'));
  });

  test('Pass empty input for completedIds, so nothing to compute', () => {
    const path = pathResolver.compute({ completedIds: [] });

    const providedElementsCompleted = path.provided.completed;
    expect(providedElementsCompleted.shapes).toEqual([]);
    expect(providedElementsCompleted.edges).toEqual([]);

    const computedElementsCompleted = path.computed.completed;
    expect(computedElementsCompleted.shapes).toEqual([]);
    expect(computedElementsCompleted.edges).toEqual([]);
  });

  test('Pass shapes only for completedIds, so compute only edges', () => {
    // StartEvent_1 --> Task_1 --> Gateway_1 --> Task_2_1 --> Gateway_2 --> Task_3 --> EndEvent_1
    const completedIds = ['Task_1', 'StartEvent_1', 'Task_3', 'EndEvent_1'];
    ensureElementsExistInModel(completedIds);

    const path = pathResolver.compute({ completedIds: completedIds });

    const providedElementsCompleted = path.provided.completed;
    expect(mapToIds(providedElementsCompleted.shapes)).toEqual(['Task_1', 'StartEvent_1', 'Task_3', 'EndEvent_1']);
    expect(providedElementsCompleted.edges).toEqual([]);

    const computedElementsCompleted = path.computed.completed;
    expect(computedElementsCompleted.shapes).toEqual([]);
    expect(mapToIds(computedElementsCompleted.edges)).toEqual(['Flow_StartEvent_1_Task_1', 'Flow_Task_3_EndEvent_1']);
    // only check the properties for one element, assuming that remaining elements are retrieved in the same way
    expect(computedElementsCompleted.edges[1]).toEqual({
      id: 'Flow_Task_3_EndEvent_1',
      isShape: false,
      kind: FlowKind.SEQUENCE_FLOW,
      sourceRefId: 'Task_3',
      targetRefId: 'EndEvent_1',
    } as EdgeBpmnSemantic);
  });

  test('Pass edges only for completedIds, so compute only shapes', () => {
    // StartEvent_1 --> Task_1 --> Gateway_1 --> Task_2_1 ----------------------> Gateway_2 --> Task_3 --> EndEvent_1
    //                                |--------> Task_2_2 --> IntermediateEvent_1 ---|
    const completedIds = ['Flow_Task_1_Gateway_1', 'Flow_Task_2_2_IntermediateEvent_1'];
    ensureElementsExistInModel(completedIds);

    const path = pathResolver.compute({ completedIds: completedIds });

    const providedElementsCompleted = path.provided.completed;
    expect(providedElementsCompleted.shapes).toEqual([]);
    expect(mapToIds(providedElementsCompleted.edges)).toEqual(['Flow_Task_1_Gateway_1', 'Flow_Task_2_2_IntermediateEvent_1']);

    const computedElementsCompleted = path.computed.completed;
    expect(computedElementsCompleted.edges).toEqual([]);
    expect(mapToIds(computedElementsCompleted.shapes)).toEqual(['Task_1', 'Gateway_1', 'Task_2_2', 'IntermediateEvent_1']);
    // only check the properties for one element, assuming that remaining elements are retrieved in the same way
    expect(computedElementsCompleted.shapes[3]).toEqual({
      eventDefinitionKind: ShapeBpmnEventDefinitionKind.TIMER,
      id: 'IntermediateEvent_1',
      incomingIds: ['Flow_Task_2_2_IntermediateEvent_1'],
      isShape: true,
      kind: ShapeBpmnElementKind.EVENT_INTERMEDIATE_CATCH,
      name: 'Timer intermediate event',
      outgoingIds: ['Flow_IntermediateEvent_1_Gateway_2'],
    } as ShapeBpmnSemantic);
  });

  test('Pass 2 consecutive edges only for completedIds, so compute only shapes without duplicates', () => {
    // StartEvent_1 --> Task_1 --> Gateway_1 --> Task_2_1 ----------------------> Gateway_2 --> Task_3 --> EndEvent_1
    //                                |--------> Task_2_2 --> IntermediateEvent_1 ---|
    const completedIds = ['Flow_Task_1_Gateway_1', 'Flow_StartEvent_1_Task_1'];
    ensureElementsExistInModel(completedIds);

    const path = pathResolver.compute({ completedIds: completedIds });

    const computedElementsCompleted = path.computed.completed;
    expect(computedElementsCompleted.edges).toEqual([]);
    expect(mapToIds(computedElementsCompleted.shapes)).toEqual(['Task_1', 'Gateway_1', 'StartEvent_1']);
  });

  test('Pass duplicated shapes and edges for completedIds', () => {
    // StartEvent_1 --> Task_1 --> Gateway_1 --> Task_2_1 --> Gateway_2 --> Task_3 --> EndEvent_1
    const completedIds = [
      'Task_1',
      'StartEvent_1',
      'Flow_Gateway_1_Task_2_1',
      // duplicates
      'Flow_Gateway_1_Task_2_1',
      'Task_1',
      'Flow_Gateway_1_Task_2_1',
      'Task_1',
      'StartEvent_1',
    ];
    ensureElementsExistInModel(completedIds);

    const path = pathResolver.compute({ completedIds: completedIds });

    const providedElementsCompleted = path.provided.completed;
    expect(mapToIds(providedElementsCompleted.shapes)).toEqual(['Task_1', 'StartEvent_1']);
    expect(mapToIds(providedElementsCompleted.edges)).toEqual(['Flow_Gateway_1_Task_2_1']);

    const computedElementsCompleted = path.computed.completed;
    expect(mapToIds(computedElementsCompleted.shapes)).toEqual(['Gateway_1', 'Task_2_1']);
    expect(mapToIds(computedElementsCompleted.edges)).toEqual(['Flow_StartEvent_1_Task_1']);
  });

  test('Passing both existing and non existing ids for completedIds, both shapes and edges', () => {
    const existingIds = ['Task_2_1', 'Flow_StartEvent_1_Task_1', 'Gateway_1', 'Flow_IntermediateEvent_1_Gateway_2'];
    ensureElementsExistInModel(existingIds);

    const path = pathResolver.compute({ completedIds: [...existingIds, 'not_existing_1', 'not_existing_2'] });

    const providedElementsCompleted = path.provided.completed;
    expect(mapToIds(providedElementsCompleted.shapes)).toEqual(['Task_2_1', 'Gateway_1']);
    expect(mapToIds(providedElementsCompleted.edges)).toEqual(['Flow_StartEvent_1_Task_1', 'Flow_IntermediateEvent_1_Gateway_2']);
    // only check the properties for one element, assuming that remaining elements are retrieved in the same way
    expect(providedElementsCompleted.shapes[0]).toEqual({
      id: 'Task_2_1',
      incomingIds: ['Flow_Gateway_1_Task_2_1'],
      isShape: true,
      kind: ShapeBpmnElementKind.TASK_USER,
      name: 'Task 2.1',
      outgoingIds: ['Flow_Task_2_1_Gateway_2'],
    } as ShapeBpmnSemantic);
    expect(providedElementsCompleted.edges[0]).toEqual({
      id: 'Flow_StartEvent_1_Task_1',
      isShape: false,
      kind: FlowKind.SEQUENCE_FLOW,
      sourceRefId: 'StartEvent_1',
      targetRefId: 'Task_1',
    } as EdgeBpmnSemantic);

    const computedElementsCompleted = path.computed.completed;
    expect(mapToIds(computedElementsCompleted.shapes)).toEqual(['StartEvent_1', 'Task_1', 'IntermediateEvent_1', 'Gateway_2']);
    // only check the properties for one element, assuming that remaining elements are retrieved in the same way
    expect(computedElementsCompleted.shapes[3]).toEqual({
      id: 'Gateway_2',
      incomingIds: ['Flow_IntermediateEvent_1_Gateway_2', 'Flow_Task_2_1_Gateway_2'],
      isShape: true,
      kind: ShapeBpmnElementKind.GATEWAY_EXCLUSIVE,
      outgoingIds: ['Flow_Gateway_2_Task_3'],
    } as ShapeBpmnSemantic);

    expect(mapToIds(computedElementsCompleted.edges)).toEqual(['Flow_Gateway_1_Task_2_1']);
    expect(computedElementsCompleted.edges[0]).toEqual({
      id: 'Flow_Gateway_1_Task_2_1',
      isShape: false,
      kind: FlowKind.SEQUENCE_FLOW,
      sourceRefId: 'Gateway_1',
      targetRefId: 'Task_2_1',
    } as EdgeBpmnSemantic);
  });

  test('Do not return computed elements that are already provided, both shapes and edges', () => {
    const completedIds = ['Task_1', 'Flow_StartEvent_1_Task_1', 'StartEvent_1'];
    ensureElementsExistInModel(completedIds);

    const path = pathResolver.compute({ completedIds: completedIds });

    const providedElementsCompleted = path.provided.completed;
    expect(mapToIds(providedElementsCompleted.shapes)).toEqual(['Task_1', 'StartEvent_1']);
    expect(mapToIds(providedElementsCompleted.edges)).toEqual(['Flow_StartEvent_1_Task_1']);

    const computedElementsCompleted = path.computed.completed;
    // Already provided: 'StartEvent_1', 'Task_1'
    expect(mapToIds(computedElementsCompleted.shapes)).toEqual([]);
    // Already provide: Flow_StartEvent_1_Task_1
    expect(mapToIds(computedElementsCompleted.edges)).toEqual([]);
  });
});
