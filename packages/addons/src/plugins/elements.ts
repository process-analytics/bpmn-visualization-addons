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

import type { BpmnVisualization, Plugin } from '../plugins-support.js';
import type { BpmnElement, BpmnElementKind, BpmnSemantic, ElementsRegistry } from 'bpmn-visualization';

export class ElementsPlugin implements Plugin, ElementsRegistry {
  private readonly elementsRegistry: ElementsRegistry;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.elementsRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  getElementsByIds(bpmnElementIds: string | string[]): BpmnElement[] {
    return this.elementsRegistry.getElementsByIds(bpmnElementIds);
  }

  getElementsByKinds(bpmnKinds: BpmnElementKind | BpmnElementKind[]): BpmnElement[] {
    return this.elementsRegistry.getElementsByKinds(bpmnKinds);
  }

  getModelElementsByIds(bpmnElementIds: string | string[]): BpmnSemantic[] {
    return this.elementsRegistry.getModelElementsByIds(bpmnElementIds);
  }

  getModelElementsByKinds(bpmnKinds: BpmnElementKind | BpmnElementKind[]): BpmnSemantic[] {
    return this.elementsRegistry.getModelElementsByKinds(bpmnKinds);
  }

  getPluginId(): string {
    return 'elements';
  }
}
