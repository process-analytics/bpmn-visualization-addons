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

import type { EdgeBpmnSemantic, ElementsRegistry, ShapeBpmnSemantic } from 'bpmn-visualization';

const inferEdgeIds = (shapes: ShapeBpmnSemantic[]): string[] => {
  const incomingIds: string[] = [];
  const outgoingIds: string[] = [];
  for (const shape of shapes) {
    incomingIds.push(...shape.incomingIds);
    outgoingIds.push(...shape.outgoingIds);
  }
  return incomingIds.filter(incomingId => outgoingIds.includes(incomingId));
};

/**
 * A general implementation for Path resolution.
 *
 * As it is generic and covers general use cases, its capabilities are limited.
 *
 * For the path resolution of single case/instance of a process, prefer {@link CasePathResolver}.
 */
export class PathResolver {
  constructor(private readonly elementsRegistry: ElementsRegistry) {}

  /**
   * If the `shapeIds` parameter contains ids related to edges, these ids are ignored and not returned as part of the visited edges.
   *
   * @param shapeIds the ids used to compute the visited edges
   */
  getVisitedEdges(shapeIds: string[]): string[] {
    const shapes = this.elementsRegistry.getModelElementsByIds(shapeIds).filter(element => element.isShape) as ShapeBpmnSemantic[];
    return inferEdgeIds(shapes);
  }
}

/**
 * Provides path resolution for a single process instance/case.
 *
 * It is an enhanced implementation of {@link PathResolver} with resolution options and returns categorized `BpmnSemantic` objects.
 */
export class CasePathResolver {
  constructor(private readonly elementsRegistry: ElementsRegistry) {}

  compute(input: CasePathResolverInput): CasePathResolverOutput {
    const completedElements = this.elementsRegistry.getModelElementsByIds(input.completedIds);

    const completedShapes = completedElements.filter(element => element.isShape) as ShapeBpmnSemantic[];
    const completedEdges = completedElements.filter(element => !element.isShape) as EdgeBpmnSemantic[];

    const inputElementIds = new Set(completedElements.map(element => element.id));

    // infer edges from shapes
    const computedCompletedEdgeIds = inferEdgeIds(completedShapes).filter(id => !inputElementIds.has(id));
    const computedCompletedEdges = this.elementsRegistry.getModelElementsByIds(computedCompletedEdgeIds) as EdgeBpmnSemantic[];

    // infer shapes from edges
    const computedCompletedShapeIds = completedEdges.flatMap(edge => [edge.sourceRefId, edge.targetRefId]).filter(id => !inputElementIds.has(id));
    const computedCompletedShapes = this.elementsRegistry.getModelElementsByIds(computedCompletedShapeIds) as ShapeBpmnSemantic[];

    return {
      provided: {
        completed: {
          shapes: completedShapes,
          edges: completedEdges,
        },
      },
      computed: {
        completed: {
          shapes: computedCompletedShapes,
          edges: computedCompletedEdges,
        },
      },
    };
  }
}

export interface CasePathResolverInput {
  /**
   * The IDs of elements (flowNodes/shapes and flows/edges) that are already completed. Non-existing ids will be silently ignored.
   *
   * `Completed` means that the element has been fully executed or definitively cancelled (for BPM engines that support this and allow cancelled elements to be continued).
   * No further user action or automation will update the element.
   */
  completedIds: string[];
}

export interface CasePathResolverOutput {
  /**
   * The `BpmnSemantic` objects retrieved from the model that relate to the ids passed in {@link CasePathResolverInput}.
   */
  provided: {
    completed: {
      shapes: ShapeBpmnSemantic[];
      edges: EdgeBpmnSemantic[];
    };
  };
  computed: {
    completed: {
      shapes: ShapeBpmnSemantic[];
      edges: EdgeBpmnSemantic[];
    };
  };
}
