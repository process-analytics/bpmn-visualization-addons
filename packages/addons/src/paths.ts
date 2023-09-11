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

import type { BpmnElementsRegistry, EdgeBpmnSemantic, ShapeBpmnSemantic } from 'bpmn-visualization';

/**
 * Experimental implementation for {@link https://github.com/process-analytics/bpmn-visualization-js/issues/930}
 */
export class PathResolver {
  constructor(private readonly bpmnElementsRegistry: BpmnElementsRegistry) {}

  /**
   * Currently, if the shapeIds parameter contains ids related to edges, these ids are ignored and not returned as part of the visited edges.
   *
   * @param shapeIds
   */
  getVisitedEdges(shapeIds: string[]): string[] {
    const edgeIds = new Set<string>();
    for (const shapeId of shapeIds) {
      const shapeElt = this.bpmnElementsRegistry.getModelElementsByIds(shapeId)[0];
      // filter non existing elements and edges
      if (!shapeElt?.isShape) {
        continue;
      }

      const bpmnSemantic = shapeElt as ShapeBpmnSemantic;
      const incomingEdges = bpmnSemantic.incomingIds;
      const outgoingEdges = bpmnSemantic.outgoingIds;
      for (const edgeId of incomingEdges) {
        const edgeElement = this.bpmnElementsRegistry.getModelElementsByIds(edgeId)[0];
        const sourceRef = (edgeElement as EdgeBpmnSemantic).sourceRefId;
        if (shapeIds.includes(sourceRef)) {
          edgeIds.add(edgeId);
        }
      }

      for (const edgeId of outgoingEdges) {
        const edgeElement = this.bpmnElementsRegistry.getModelElementsByIds(edgeId)[0];
        const targetRef = (edgeElement as EdgeBpmnSemantic).targetRefId;
        if (shapeIds.includes(targetRef)) {
          edgeIds.add(edgeId);
        }
      }
    }

    return Array.from(edgeIds);
  }
}
