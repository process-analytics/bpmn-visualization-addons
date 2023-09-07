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
import { BpmnElementsIdentifier, BpmnElementsSearcher, BpmnVisualization } from '../../src';
import { insertBpmnContainerWithoutId } from '../shared/dom-utils';
import { readFileSync } from '../shared/io-utils';

describe('Find element ids by providing names', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId() });
  bpmnVisualization.load(readFileSync('./fixtures/bpmn/search-elements.bpmn'));
  const bpmnElementsSearcher = new BpmnElementsSearcher(bpmnVisualization.bpmnElementsRegistry);

  const getModelElementName = (bpmnElementId: string): string => bpmnVisualization.bpmnElementsRegistry.getModelElementsByIds(bpmnElementId).map(element => element.name)[0];

  test('an existing flow node', () => {
    expect(bpmnElementsSearcher.getElementIdByName('start event 1')).toBe('StartEvent_1');
    expect(bpmnElementsSearcher.getElementIdByName('gateway 1')).toBe('Gateway_1');
  });

  test('several existing tasks with the same name', () => {
    // Verify that several elements have the same names
    expect(getModelElementName('Task_1')).toBe('task 1');
    expect(getModelElementName('Task_with_same_name_as_Task_1')).toBe('task 1');

    // Retrieve the first one
    expect(bpmnElementsSearcher.getElementIdByName('task 1')).toBe('Task_1');
  });

  test('an existing flow', () => {
    expect(bpmnElementsSearcher.getElementIdByName('seq flow 10')).toBe('sequenceFlow_10');
    expect(bpmnElementsSearcher.getElementIdByName('message flow 1')).toBe('messageFlow_1');
  });

  test('several existing sequence flows with the same name', () => {
    // Verify that several elements have the same names
    expect(getModelElementName('sequenceFlow_11')).toBe('seq flow 11');
    expect(getModelElementName('sequenceFlow_with_same_name_as_sequenceFlow_11')).toBe('seq flow 11');

    // Retrieve the first one
    expect(bpmnElementsSearcher.getElementIdByName('seq flow 11')).toBe('sequenceFlow_11');
  });

  test('unknown element', () => {
    expect(bpmnElementsSearcher.getElementIdByName('nobody knows me')).toBeUndefined();
  });
});

describe('Identify elements', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null! });
  bpmnVisualization.load(readFileSync('./fixtures/bpmn/search-elements.bpmn'));
  const bpmnElementsIdentifier = new BpmnElementsIdentifier(bpmnVisualization.bpmnElementsRegistry);

  test('task', () => {
    const taskId = 'Task_2_1';
    expect(bpmnElementsIdentifier.isActivity(taskId)).toBeTruthy();
    expect(bpmnElementsIdentifier.isBpmnArtifact(taskId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isEvent(taskId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isGateway(taskId)).toBeFalsy();
  });

  test('text annotation', () => {
    const textAnnotationId = 'TextAnnotation_1';
    expect(bpmnElementsIdentifier.isActivity(textAnnotationId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isBpmnArtifact(textAnnotationId)).toBeTruthy();
    expect(bpmnElementsIdentifier.isEvent(textAnnotationId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isGateway(textAnnotationId)).toBeFalsy();
  });

  test('event', () => {
    const eventId = 'StartEvent_1';
    expect(bpmnElementsIdentifier.isActivity(eventId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isBpmnArtifact(eventId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isEvent(eventId)).toBeTruthy();
    expect(bpmnElementsIdentifier.isGateway(eventId)).toBeFalsy();
  });

  test('gateway', () => {
    const gatewayId = 'Gateway_1';
    expect(bpmnElementsIdentifier.isActivity(gatewayId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isBpmnArtifact(gatewayId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isEvent(gatewayId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isGateway(gatewayId)).toBeTruthy();
  });

  test('unknown element', () => {
    const unknownId = 'i_do_not_exist';
    expect(bpmnElementsIdentifier.isActivity(unknownId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isBpmnArtifact(unknownId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isEvent(unknownId)).toBeFalsy();
    expect(bpmnElementsIdentifier.isGateway(unknownId)).toBeFalsy();
  });
});
