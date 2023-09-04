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

import './path-resolver.css';
import { FitType } from 'bpmn-visualization';
import { BpmnVisualization, OverlaysPlugin } from '@process-analytics/bv-experimental-add-ons';
// This is simple example of the BPMN diagram, loaded as string. The '?.raw' extension support is provided by Vite.
// For other load methods, see https://github.com/process-analytics/bpmn-visualization-examples
import diagram from './diagram.bpmn?raw';

// Instantiate BpmnVisualization, and pass the OverlaysPlugin
const bpmnVisualization = new BpmnVisualization({
  container: 'bpmn-container',
  navigation: { enabled: false },
  plugins: [OverlaysPlugin],
});
// Load the BPMN diagram defined above
bpmnVisualization.load(diagram, { fit: { type: FitType.Center, margin: 20 } });

// Add overlays
const bpmnElementsRegistry = bpmnVisualization.bpmnElementsRegistry;
const overlayStyle = { stroke: { color: 'chartreuse' }, fill: { color: 'chartreuse' }, font: { color: 'white', size: 18 } };
// SRM subprocess
bpmnElementsRegistry.addOverlays('Activity_0ec8azh', { label: '123', position: 'top-center', style: overlayStyle });
// Record Service Entry Sheet
bpmnElementsRegistry.addOverlays('Activity_06cvihl', { label: '100', position: 'top-left', style: overlayStyle });
// Record Invoice Receipt
bpmnElementsRegistry.addOverlays('Activity_1u4jwkv', { label: '123', position: 'bottom-center', style: overlayStyle });
// Remove Payment Block
bpmnElementsRegistry.addOverlays('Activity_083jf01', { label: '147', position: 'top-right', style: overlayStyle });

// Configure button to hide/show overlays
const overlaysPlugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
let isOverlaysVisible = true;
const overlaysVisibilityButton = document.querySelector('#btn-overlays-visibility') as HTMLButtonElement;
const handleOverlaysVisibility = (): void => {
  isOverlaysVisible = !isOverlaysVisible;
  overlaysPlugin.setVisible(isOverlaysVisible);
  overlaysVisibilityButton.innerText = isOverlaysVisible ? 'Hide overlays' : 'Show overlays';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
overlaysVisibilityButton.addEventListener('click', _ev => {
  handleOverlaysVisibility();
});
