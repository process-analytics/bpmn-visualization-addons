/*
Copyright 2022 Bonitasoft S.A.

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

// eslint-disable-next-line n/file-extension-in-import, n/no-missing-import
import { BpmnElementsIdentifier, PathResolver } from '@process-analytics/bpmn-visualization-addons';
// eslint-disable-next-line n/no-extraneous-import
import { BpmnVisualization } from 'bpmn-visualization';

// bpmn-visualization
const bpmnVisualization = new BpmnVisualization({ container: 'bpmn-container' });
bpmnVisualization.load(`fake BPMN content`);
const bpmnElementsRegistry = bpmnVisualization.bpmnElementsRegistry;

// addons
const bpmnElementsIdentifier = new BpmnElementsIdentifier(bpmnElementsRegistry);
bpmnElementsIdentifier.isActivity('id_1');

const pathResolver = new PathResolver(bpmnElementsRegistry);
pathResolver.getVisitedEdges(['id_1', 'id_2']);
