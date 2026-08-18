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

import { BpmnElementsIdentifier, BpmnVisualization, CssClassesPlugin, PathResolver } from '@process-analytics/bpmn-visualization-addons';

// bpmn-visualization, through the BpmnVisualization subclass provided by the addons. Importing it from
// `bpmn-visualization` would also compile, but would not provide plugin support.
// The `plugins` property comes from the module augmentation of `GlobalOptions`. The demo checks it too, but only
// here is it checked against the lowest supported TypeScript version.
const bpmnVisualization = new BpmnVisualization({ container: 'bpmn-container', plugins: [CssClassesPlugin] });
bpmnVisualization.load(`fake BPMN content`);
const bpmnElementsRegistry = bpmnVisualization.bpmnElementsRegistry;

// addons: plugin retrieval, in both forms documented in the README
const cssClassesPlugin = bpmnVisualization.getPlugin<CssClassesPlugin>('css');
cssClassesPlugin?.addCssClasses('id_1', 'class_1');
bpmnVisualization.getPlugin<CssClassesPlugin>('css')!.addCssClasses('id_2', 'class_2');

// addons
const bpmnElementsIdentifier = new BpmnElementsIdentifier(bpmnElementsRegistry);
bpmnElementsIdentifier.isActivity('id_1');

const pathResolver = new PathResolver(bpmnElementsRegistry);
pathResolver.getVisitedEdges(['id_1', 'id_2']);
