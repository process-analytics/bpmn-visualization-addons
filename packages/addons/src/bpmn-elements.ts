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
 * Options to deduplicate elements when several names match.
 */
export type DeduplicateNamesOptions = {
  /** If not set, use all `BpmnElementKind` values. */
  kinds?: BpmnElementKind[];
  /** Apply custom function to filter duplicates. */
  filter?: (bpmnSemantic: BpmnSemantic) => boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const acceptAll = (_bpmnSemantic: BpmnSemantic): boolean => true;

/**
 * Provides workarounds for {@link https://github.com/process-analytics/bpmn-visualization-js/issues/2453}.
 */
export class BpmnElementsSearcher {
  constructor(private readonly elementsRegistry: ElementsRegistry) {}

  /**
   * Find the ID of the first element that matches the provided name.
   * @param name the name of the element to retrieve.
   */
  getElementIdByName(name: string): string | undefined {
    return this.getElementByName(name)?.id;
  }

  /**
   * Find the element that matches the provided name.
   *
   * Use the `deduplicateOptions` parameter to modify the default behavior of deduplication processing.
   *
   * The deduplication process is done in this order:
   * - look for elements matching the provided kinds. If not specified, use all `BpmnElementKind` values.
   * - apply the deduplication filter if provided, otherwise take the first element corresponding to the name provided.
   *
   * @param name the name of the element to retrieve.
   * @param deduplicateOptions if not defined, or if the object doesn't define any properties, duplicates are filtered out by selecting the first element corresponding to the name provided.
   */
  getElementByName(name: string, deduplicateOptions?: DeduplicateNamesOptions): BpmnSemantic | undefined {
    // Not optimized, do a full lookup at each call
    // Split query by kind to avoid returning a big chunk of data
    for (const kind of deduplicateOptions?.kinds ?? allBpmnElementKinds) {
      const candidate = this.elementsRegistry
        .getModelElementsByKinds(kind)
        .filter(element => element.name === name)
        .find(element => (deduplicateOptions?.filter ?? acceptAll)(element));

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
