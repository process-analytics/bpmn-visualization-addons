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

import {
  type BpmnElementsRegistry,
  type BpmnSemantic,
  ShapeBpmnElementKind,
  ShapeUtil,
} from 'bpmn-visualization';

/**
 * Provides workarounds for {@link https://github.com/process-analytics/bpmn-visualization-js/issues/2453}.
 */
export class BpmnElementsSearcher {
  constructor(private readonly bpmnElementsRegistry: BpmnElementsRegistry) {}

  getElementIdByName(name: string): string | undefined {
    return this.getElementByName(name)?.id;
  }

  // Only work for shape for now
  // not optimize, do a full lookup at each call
  private getElementByName(name: string): BpmnSemantic | undefined {
    const kinds = Object.values(ShapeBpmnElementKind);
    // Split query by kind to avoid returning a big chunk of data
    for (const kind of kinds) {
      const bpmnSemantics = this.bpmnElementsRegistry.getElementsByKinds(kind)
        .map(elt => elt.bpmnSemantic)
        .filter(Boolean);

      // May have been implemented with: bpmnSemantics.filter(bpmnSemantic => bpmnSemantic.name === name)[0];
      // Here, we stop the search right after we find a matching name
      for (const bpmnSemantic of bpmnSemantics) {
        if (bpmnSemantic.name === name) {
          return bpmnSemantic;
        }
      }
    }

    return undefined;
  }
}

export class BpmnElementsIdentifier {
  constructor(private readonly bpmnElementsRegistry: BpmnElementsRegistry) {}

  isActivity(elementId: string): boolean {
    return this.isInCategory(ShapeUtil.isActivity, elementId);
  }

  isGateway(elementId: string): boolean {
    return this.isInCategory(ShapeUtil.isGateway, elementId);
  }

  isEvent(elementId: string): boolean {
    return this.isInCategory(ShapeUtil.isEvent, elementId);
  }

  private isInCategory(categorizeFunction: (value: string) => boolean, elementId: string): boolean {
    const elements = this.bpmnElementsRegistry.getElementsByIds(elementId);
    if (elements.length > 0) {
      const kind = elements[0].bpmnSemantic.kind;
      return categorizeFunction(kind);
    }

    return false;
  }
}
