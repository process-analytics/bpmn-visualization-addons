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

import type { BpmnElementKind, BpmnSemantic, ElementsRegistry } from 'bpmn-visualization';
import { FlowKind, ShapeBpmnElementKind, ShapeUtil as BaseShapeUtil } from 'bpmn-visualization';

const allBpmnElementKinds: BpmnElementKind[] = [...Object.values(ShapeBpmnElementKind), ...Object.values(FlowKind)];

/**
 * Provides workarounds for {@link https://github.com/process-analytics/bpmn-visualization-js/issues/2453}.
 */
export class BpmnElementsSearcher {
  constructor(private readonly elementsRegistry: ElementsRegistry) {}

  getElementIdByName(name: string): string | undefined {
    return this.getElementByName(name)?.id;
  }

  // Only work for shape for now. See https://github.com/process-analytics/bv-experimental-add-ons/issues/113
  // not optimize, do a full lookup at each call
  private getElementByName(name: string): BpmnSemantic | undefined {
    // Split query by kind to avoid returning a big chunk of data
    for (const kind of allBpmnElementKinds) {
      const candidate = this.elementsRegistry.getModelElementsByKinds(kind).filter(element => element.name === name)[0];
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }
}

export class BpmnElementsIdentifier {
  constructor(private readonly elementsRegistry: ElementsRegistry) {}

  isActivity(elementId: string): boolean {
    return this.isInCategory(BaseShapeUtil.isActivity, elementId);
  }

  isBpmnArtifact(elementId: string): boolean {
    return this.isInCategory(ShapeUtil.isBpmnArtifact, elementId);
  }

  isGateway(elementId: string): boolean {
    return this.isInCategory(BaseShapeUtil.isGateway, elementId);
  }

  isEvent(elementId: string): boolean {
    return this.isInCategory(BaseShapeUtil.isEvent, elementId);
  }

  private isInCategory(categorizeFunction: (value: string) => boolean, elementId: string): boolean {
    const elements = this.elementsRegistry.getModelElementsByIds(elementId);
    if (elements.length > 0) {
      const kind = elements[0].kind;
      return categorizeFunction(kind);
    }

    return false;
  }
}

export class ShapeUtil extends BaseShapeUtil {
  static isBpmnArtifact = (kind: ShapeBpmnElementKind | string): boolean => {
    return kind === ShapeBpmnElementKind.GROUP || kind === ShapeBpmnElementKind.TEXT_ANNOTATION;
  };
}
