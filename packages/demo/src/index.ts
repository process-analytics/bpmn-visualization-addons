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

import './style.css';
import {BpmnElement, BpmnVisualization, FitType, type Overlay, ShapeUtil} from 'bpmn-visualization';
// This is simple example of the BPMN diagram, loaded as string. The '?.raw' extension support is provided by Vite.
// For other load methods, see https://github.com/process-analytics/bpmn-visualization-examples
// eslint-disable-next-line n/file-extension-in-import -- Vite syntax
import diagram from './diagram.bpmn?raw';
import {isBpmnArtifact} from "./bpmn-utils";

// Instantiate BpmnVisualization, pass the container HTMLElement - present in index.html
const bpmnVisualization = new BpmnVisualization({
  container: 'bpmn-container',
  navigation: {
    enabled: true,
  },
});
// Load the BPMN diagram defined above
bpmnVisualization.load(diagram, {fit: {type: FitType.Center, margin: 20}});
const bpmnElementsRegistry = bpmnVisualization.bpmnElementsRegistry;


// =====================================================================================================================
// CODE OF THE DEMO TEMPLATE
// =====================================================================================================================

// Highlight tasks with CSS classes
bpmnElementsRegistry.addCssClasses(
  [
    'Activity_00vbm9s', // Record Goods Receipts
    'Activity_1t65hvk', // Create Purchase Order Item
  ],
  'bpmn-highlight',
);

// Change the style of some elements using the "Update Style" API
bpmnElementsRegistry.updateStyle([
  'Activity_1u4jwkv', // Record Invoice Receipt
  'Flow_0lrixjg',
  'Gateway_0a68dfj',
  'Flow_1r9qd61',
  'Activity_083jf01', // Remove Payment Block
], {stroke: {color: 'blue'}, fill: {color: 'lightblue'}});

// Add overlays
const overlayConfiguration: Omit<Overlay, 'label'> = {
  position: 'top-center',
  style: {
    fill: {
      color: 'blue',
    },
    font: {
      color: 'white',
      size: 18,
    },
    stroke: {
      color: 'blue',
    },
  },
};
bpmnElementsRegistry.addOverlays('Activity_1u4jwkv',
  {
    ...overlayConfiguration,
    label: '12',
  });
bpmnElementsRegistry.addOverlays('Activity_083jf01',
  {
    ...overlayConfiguration,
    label: '19',
  });

// =====================================================================================================================
// NEW CODE
// =====================================================================================================================

const getAllFlowNodes = (): BpmnElement[] => bpmnElementsRegistry.getElementsByKinds(ShapeUtil.flowNodeKinds().filter(kind => !isBpmnArtifact(kind)));

const setupEventHandlers = () => {
  // TODO use "for of instead"
  getAllFlowNodes().forEach(item => {
    const currentId = item.bpmnSemantic.id;
    item.htmlElement.onclick = () => {
      console.info('clicked', currentId)
      // setSelectedElement(currentId);
    };
    // TODO change cursor to notify it can be clicked
    // when already clicked/selected, do not change on mouseenter
    // item.htmlElement.onmouseenter = (ev) => {
    //   if (ev.buttons == 1) {
    //     return;
    //   }
    //   registry.addCssClasses(currentId, 'highlightNode');
    // };
    // item.htmlElement.onmouseleave = () => {
    //   registry.removeCssClasses(currentId, 'highlightNode');
    // };
  });
};

setupEventHandlers();


// =====================================================================================================================

// Display the bpmn-visualization version in the footer
const footer = document.querySelector<HTMLElement>('footer')!;
const version = bpmnVisualization.getVersion();
const versionAsString = `bpmn-visualization@${version.lib}`;
footer.textContent = `${versionAsString}`;
