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

import type { BpmnElementsRegistry, ShapeBpmnSemantic } from 'bpmn-visualization';

/**
 * Experimental implementation for {@link https://github.com/process-analytics/bpmn-visualization-js/issues/930}
 */
export class PathResolver {
  constructor(private readonly bpmnElementsRegistry: BpmnElementsRegistry) {}

  /**
   * Currently, if the `shapeIds` parameter contains ids related to edges, these ids are ignored and not returned as part of the visited edges.
   *
   * @param shapeIds the ids used to compute the visited edges
   */
  getVisitedEdges(shapeIds: string[]): string[] {
    const incomingIds = [] as string[];
    const outgoingIds = [] as string[];

    const shapes = this.bpmnElementsRegistry.getModelElementsByIds(shapeIds).filter(element => element.isShape) as ShapeBpmnSemantic[];
    for (const shape of shapes) {
      incomingIds.push(...shape.incomingIds);
      outgoingIds.push(...shape.outgoingIds);
    }

    // find edges and remove duplicates
    return [...new Set(incomingIds.filter(incomingId => outgoingIds.includes(incomingId)))];
  }
}
