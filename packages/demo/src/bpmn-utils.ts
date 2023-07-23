import { ShapeBpmnElementKind } from 'bpmn-visualization';

// TODO duplicated with https://github.com/process-analytics/bpmn-visualization-examples/blob/v0.37.0/projects/typescript-vue/src/bpmn-utils.ts
//      provide directly in bpmn-visualization or in bv-experimental-addons
export const isBpmnArtifact = (kind: ShapeBpmnElementKind): boolean => {
  // may be directly available in bpmn-visualization in the future
  return kind === ShapeBpmnElementKind.GROUP || kind === ShapeBpmnElementKind.TEXT_ANNOTATION ;
};
