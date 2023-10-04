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
import { ShapeBpmnElementKind, ShapeBpmnEventDefinitionKind, type ShapeBpmnSemantic } from 'bpmn-visualization';

import { BpmnVisualization } from '../../../src';
import { ElementsPlugin } from '../../../src/plugins/elements';
import { insertBpmnContainerWithoutId } from '../../shared/dom-utils';
import { readFileSync } from '../../shared/io-utils';

// The actual implementation is in `bpmn-visualization`. Here, we only validate that the `bpmn-visualization` code is called.
describe('Check ElementsPlugin methods', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [ElementsPlugin] });
  bpmnVisualization.load(readFileSync('./fixtures/bpmn/search-elements.bpmn'));
  const elementsPlugin = bpmnVisualization.getPlugin<ElementsPlugin>('elements');

  test('getElementsByIds', () => {
    const bpmnElements = elementsPlugin.getElementsByIds('Gateway_0t7d2lu');

    expect(bpmnElements).toHaveLength(1);
    const bpmnElement = bpmnElements[0];
    expect(bpmnElement.htmlElement).toBeDefined();
    expect(bpmnElement.bpmnSemantic).toEqual({
      id: 'Gateway_0t7d2lu',
      incomingIds: ['Flow_045a06d', 'Flow_1cj2f9n', 'Flow_0qnma25'],
      isShape: true,
      kind: ShapeBpmnElementKind.GATEWAY_EXCLUSIVE,
      name: 'gateway 2',
      outgoingIds: ['Flow_0p544v1'],
      parentId: 'Participant_0onpt9o',
    } as ShapeBpmnSemantic);
  });

  test('getElementsByKinds', () => {
    const bpmnElements = elementsPlugin.getElementsByKinds(ShapeBpmnElementKind.EVENT_END);

    expect(bpmnElements).toHaveLength(2);

    const bpmnElement1 = bpmnElements[0];
    expect(bpmnElement1.htmlElement).toBeDefined();
    expect(bpmnElement1.bpmnSemantic).toEqual({
      eventDefinitionKind: ShapeBpmnEventDefinitionKind.NONE,
      id: 'Event_1hr2hqx',
      incomingIds: ['Flow_0p544v1'],
      isShape: true,
      kind: ShapeBpmnElementKind.EVENT_END,
      name: 'end event 1',
      outgoingIds: [],
      parentId: 'Participant_0onpt9o',
    } as ShapeBpmnSemantic);

    const bpmnElement2 = bpmnElements[1];
    expect(bpmnElement2.htmlElement).toBeDefined();
    expect(bpmnElement2.bpmnSemantic).toEqual({
      eventDefinitionKind: ShapeBpmnEventDefinitionKind.NONE,
      id: 'Event_0md1mpw',
      incomingIds: ['sequenceFlow_with_same_name_as_sequenceFlow_11'],
      isShape: true,
      kind: ShapeBpmnElementKind.EVENT_END,
      name: 'end event 10',
      outgoingIds: [],
      parentId: 'Participant_0zym2fg',
    } as ShapeBpmnSemantic);
  });

  test('getModelElementsByIds', () => {
    const elements = elementsPlugin.getModelElementsByIds('Activity_08z13ne');

    expect(elements).toHaveLength(1);
    expect(elements[0]).toEqual({
      id: 'Activity_08z13ne',
      incomingIds: ['Flow_1xozzqt'],
      isShape: true,
      kind: ShapeBpmnElementKind.TASK,
      name: 'task 2.2',
      outgoingIds: ['Flow_1cj2f9n'],
      parentId: 'Participant_0onpt9o',
    } as ShapeBpmnSemantic);
  });

  test('getModelElementsByKinds', () => {
    const elements = elementsPlugin.getModelElementsByKinds(ShapeBpmnElementKind.TEXT_ANNOTATION);

    expect(elements).toHaveLength(2);

    expect(elements[0]).toEqual({
      id: 'TextAnnotation_1',
      incomingIds: ['Association_0fwvz81'],
      isShape: true,
      kind: ShapeBpmnElementKind.TEXT_ANNOTATION,
      name: 'Duplicated name on purpose',
      outgoingIds: [],
      parentId: 'Participant_0onpt9o',
    } as ShapeBpmnSemantic);

    expect(elements[1]).toEqual({
      id: 'TextAnnotation_13ptcyf',
      incomingIds: ['Association_1ovp59n'],
      isShape: true,
      kind: ShapeBpmnElementKind.TEXT_ANNOTATION,
      name: 'Duplicated name on purpose',
      outgoingIds: [],
      parentId: 'Participant_0zym2fg',
    } as ShapeBpmnSemantic);
  });
});
