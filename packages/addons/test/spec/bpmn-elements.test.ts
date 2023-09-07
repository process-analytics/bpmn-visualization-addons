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

  test('name of an existing element', () => {
    expect(bpmnElementsSearcher.getElementIdByName('start event 1')).toBe('StartEvent_1');
  });

  test('name of of several existing tasks', () => {
    expect(bpmnElementsSearcher.getElementIdByName('task 1')).toBe('Task_1');
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