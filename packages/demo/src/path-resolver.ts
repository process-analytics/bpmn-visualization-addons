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

import './assets/path-resolver.css';
import type { BpmnElement } from 'bpmn-visualization';
import { BpmnVisualization, FitType } from 'bpmn-visualization';
import { PathResolver, ShapeUtil } from '@process-analytics/bv-experimental-add-ons';
// This is simple example of the BPMN diagram, loaded as string. The '?.raw' extension support is provided by Vite.
// For other load methods, see https://github.com/process-analytics/bpmn-visualization-examples
import diagram from './assets/diagram.bpmn?raw';

// Instantiate BpmnVisualization, pass the container HTMLElement - present in path-resolver.html
const bpmnVisualization = new BpmnVisualization({
  container: 'bpmn-container',
});
// Load the BPMN diagram defined above
bpmnVisualization.load(diagram, { fit: { type: FitType.Center, margin: 20 } });
const bpmnElementsRegistry = bpmnVisualization.bpmnElementsRegistry;

const pathResolver = new PathResolver(bpmnElementsRegistry);

const selectedBpmnElements = new Set<string>();
const registerSelectedBpmnElement = (id: string): boolean => {
  if (selectedBpmnElements.has(id)) {
    return false;
  }
  selectedBpmnElements.add(id);
  return true;
};
const computedFlows: string[] = [];

function computePath(): void {
  // reset style of previously computed flows
  bpmnElementsRegistry.resetStyle(computedFlows);
  computedFlows.length = 0;

  const visitedEdges = pathResolver.getVisitedEdges([...selectedBpmnElements]);
  computedFlows.push(...visitedEdges);
  bpmnElementsRegistry.updateStyle(computedFlows, { stroke: { color: 'orange', width: 3 } });
}

function clearPath(): void {
  bpmnElementsRegistry.resetStyle([...selectedBpmnElements, ...computedFlows]);
  selectedBpmnElements.clear();
  computedFlows.length = 0;
}

const getAllFlowNodes = (): BpmnElement[] => bpmnElementsRegistry.getElementsByKinds(ShapeUtil.flowNodeKinds().filter(kind => !ShapeUtil.isBpmnArtifact(kind)));

const setupBpmnElementEventHandlers = (): void => {
  for (const item of getAllFlowNodes()) {
    const currentId = item.bpmnSemantic.id;
    const htmlElement = item.htmlElement;
    htmlElement.addEventListener('click', () => {
      if (registerSelectedBpmnElement(currentId)) {
        bpmnElementsRegistry.updateStyle(currentId, { stroke: { color: 'blue' }, fill: { color: 'lightblue' } });
      } else {
        selectedBpmnElements.delete(currentId);
        bpmnElementsRegistry.resetStyle(currentId);
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    htmlElement.addEventListener('mouseenter', _event => {
      htmlElement.style.cursor = 'pointer';
    });
  }
};

const setupControlEventHandlers = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  document.querySelector('#btn-compute-path')?.addEventListener('click', _event => {
    computePath();
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  document.querySelector('#bt-clear')?.addEventListener('click', _event => {
    clearPath();
  });
};

setupControlEventHandlers();
setupBpmnElementEventHandlers();
