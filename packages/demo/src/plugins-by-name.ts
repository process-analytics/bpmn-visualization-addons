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

import './assets/plugins-by-name.css';

import type { FitOptions, StyleUpdate } from 'bpmn-visualization';

import { BpmnVisualization, StyleByNamePlugin } from '@process-analytics/bv-experimental-add-ons';
import { FitType } from 'bpmn-visualization';

import { ZoomComponent } from './shared/zoom-component';

const diagram = await fetch('/bpmn/diagram.bpmn').then(response => response.text());

// Instantiate BpmnVisualization, and pass the OverlaysPlugin
const bpmnVisualization = new BpmnVisualization({
  container: 'bpmn-container',
  navigation: { enabled: true },
  plugins: [StyleByNamePlugin],
});
// Load the BPMN diagram defined above
const fitOptions: FitOptions = { type: FitType.Center, margin: 20 };
bpmnVisualization.load(diagram, { fit: fitOptions });

// Zoom box
new ZoomComponent(bpmnVisualization, fitOptions).render();

// Use style by name plugin to update the style of the elements
const styleRegistryByName = bpmnVisualization.getPlugin<StyleByNamePlugin>('style-by-name');

function clearAllStyles(): void {
  styleRegistryByName.resetStyle();
}

function pickRandomElement<T>(array: Array<T>): T {
  return array[Math.floor(Math.random() * array.length)];
}

const availableElements = ['Record Goods Receipts', 'Record Invoice Receipt', 'Record Service Entry Sheet', 'Clear Invoice', 'Remove Payment Block', 'SRM subprocess'];
const availableStyleUpdates: StyleUpdate[] = [
  {
    stroke: { color: 'orange', width: 3 },
  },
  {
    fill: { color: 'chartreuse' },
    font: { color: 'white', size: 18 },
    stroke: { color: 'chartreuse' },
  },
  { fill: { color: 'yellow', opacity: 30 }, font: { color: 'red' } },
];
function highlightElement(): void {
  clearAllStyles();
  const elementName = pickRandomElement<string>(availableElements);
  const styleUpdate = pickRandomElement<StyleUpdate>(availableStyleUpdates);
  styleRegistryByName.updateStyle(elementName, styleUpdate);
}

const setupControlEventHandlers = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  document.querySelector('#btn-highlight-element')?.addEventListener('click', _event => {
    highlightElement();
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  document.querySelector('#bt-clear')?.addEventListener('click', _event => {
    clearAllStyles();
  });
};
setupControlEventHandlers();
