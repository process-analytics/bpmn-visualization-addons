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
import { BpmnElementsIdentifier, BpmnVisualization } from '../../src';
import { readFileSync } from '../shared/io-utils';

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
});
