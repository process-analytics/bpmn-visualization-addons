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

import type { Overlay } from 'bpmn-visualization';
import type { mxGraph, mxGraphModel } from 'mxgraph';

import { beforeEach, describe, expect, test } from '@jest/globals';

import { BpmnVisualization, OverlaysPlugin } from '../../../src/index.js';
import { insertBpmnContainerWithoutId } from '../../shared/dom-utils.js';
import { readFileSync } from '../../shared/io-utils.js';

/**
 * Information taken from bpmn-visualization QuerySelectors
 *
 * Once mxGraph is initialized at BpmnVisualization construction, prior loading a BPMN diagram, the DOM looks like:
 * ```html
 * <div id="bpmn-container" style="touch-action: none;">
 *   <svg style="left: 0px; top: 0px; width: 100%; height: 100%; display: block; min-width: 1px; min-height: 1px;">
 *     <g>
 *       <g></g>
 *       <g></g>
 *       <g></g>
 *       <g></g>
 *     </g>
 *   </svg>
 * </div>
 * ```
 * mxGraph generates the following SVG groups (see https://github.com/jgraph/mxgraph/blob/v4.2.2/javascript/src/js/view/mxGraphView.js#L2862)
 *   - 1st: for background image
 *   - 2nd: elements of the graph (shapes and edges)
 *   - 3rd: overlays
 *   - 4th: decorators
 */
class ContainersRetriever {
  private bpmnContainer: HTMLElement;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.bpmnContainer = bpmnVisualization.graph.container;
  }

  getElementsContainer(): HTMLElement {
    return this.bpmnContainer.querySelector<HTMLElement>('svg:nth-child(1) > g:nth-child(1) > g:nth-child(2)')!;
  }

  getOverlaysContainer(): HTMLElement {
    return this.bpmnContainer.querySelector<HTMLElement>('svg:nth-child(1) > g:nth-child(1) > g:nth-child(3)')!;
  }
}

describe('setVisible', () => {
  test('Default visibility of containers', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId() });
    const containersRetriever = new ContainersRetriever(bpmnVisualization);
    const overlaysContainer = containersRetriever.getOverlaysContainer();
    expect(overlaysContainer).toBeEmptyDOMElement();
    expect(overlaysContainer).toBeVisible();
    const elementsContainer = containersRetriever.getElementsContainer();
    expect(elementsContainer).toBeEmptyDOMElement();
    expect(elementsContainer).toBeVisible();

    // load diagram
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));
    expect(elementsContainer).not.toBeEmptyDOMElement();
    expect(elementsContainer).toBeVisible();
    expect(overlaysContainer).toBeEmptyDOMElement();
    expect(overlaysContainer).toBeVisible();

    //  add overlays
    bpmnVisualization.bpmnElementsRegistry.addOverlays('ServiceTask_1.2', { label: '12', position: 'bottom-left' });
    expect(overlaysContainer).not.toBeEmptyDOMElement();
    expect(overlaysContainer).toBeVisible();
  });

  test('Hide overlays', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });

  test('Hide then show overlays', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    plugin.setVisible();
    const overlaysContainer = new ContainersRetriever(bpmnVisualization).getOverlaysContainer();
    expect(overlaysContainer).toBeVisible();
    expect(overlaysContainer).toHaveStyle('display:'); // no display set
  });

  test('Restore the original display style of the overlays container after setting visibility to false then true)', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    const overlaysContainer = new ContainersRetriever(bpmnVisualization).getOverlaysContainer();
    overlaysContainer.style.display = 'inherit';
    expect(overlaysContainer).toHaveStyle('display: inherit');

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    plugin.setVisible();
    expect(overlaysContainer).toHaveStyle('display: inherit');
  });

  test('Restore the original display style of the overlays container after setting visibility to false twice then true)', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    const overlaysContainer = new ContainersRetriever(bpmnVisualization).getOverlaysContainer();
    overlaysContainer.style.display = 'inherit';
    expect(overlaysContainer).toHaveStyle('display: inherit');

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    plugin.setVisible(false);
    plugin.setVisible();
    expect(overlaysContainer).toHaveStyle('display: inherit');
  });

  test('Setting overlays visible whereas the container has a dedicated display style do not change it)', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    const overlaysContainer = new ContainersRetriever(bpmnVisualization).getOverlaysContainer();
    overlaysContainer.style.display = 'inherit';
    expect(overlaysContainer).toHaveStyle('display: inherit');

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible();
    expect(overlaysContainer).toHaveStyle('display: inherit');
  });

  test('Hide overlays several times in a raw', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });

  test('Show overlays several times in a raw', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible();
    plugin.setVisible(true);
    plugin.setVisible();
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).toBeVisible();
  });

  test('Hide, show then hide overlays', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    const plugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
    plugin.setVisible(false);
    plugin.setVisible();
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });
});

class OverlaysExpectation {
  private readonly model: mxGraphModel;
  private graph: mxGraph;
  constructor(bpmnVisualization: BpmnVisualization) {
    this.graph = bpmnVisualization.graph;
    this.model = bpmnVisualization.graph.model;
  }

  /* eslint-disable jest/no-standalone-expect -- util code, including expect calls */
  expectNoOverlay(bpmnId: string): void {
    expect(this.getOverlays(bpmnId)).toHaveLength(0);
  }

  private getOverlays(bpmnId: string): BpmnVisualizationOverlay[] {
    const cell = this.model.getCell(bpmnId);
    return (this.graph.getCellOverlays(cell) as unknown as BpmnVisualizationOverlay[]) ?? [];
  }

  // only verify label here, the whole implementation is tested in bpmn-visualization.
  // here we only check that the underlying method is called.
  expectOverlays(bpmnId: string, labels: string[]): void {
    const overlays = this.getOverlays(bpmnId);
    expect(overlays).toHaveLength(labels.length);
    expect(overlays.map(overlay => overlay.label)).toEqual(labels);
  }
  /* eslint-enable jest/no-standalone-expect */
}

// The real type is "class MxGraphCustomOverlay extends mxgraph.mxCellOverlay" but it is not part of the API so create a convenient matching type here
// class BpmnVisualizationOverlay extends mxCellOverlay {}
// In tests in this file, we are only checking the label, so use a simple type matching the label property of the actual type.
type BpmnVisualizationOverlay = {
  label: string;
};

function createOverlay(label: string): Overlay {
  return { label, position: 'top-center' };
}

describe('Add and remove Overlays', () => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
  const overlaysPlugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
  const overlaysExpectation = new OverlaysExpectation(bpmnVisualization);

  beforeEach(() => {
    // remove all existing overlays
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));
  });

  test('Add overlays', () => {
    overlaysExpectation.expectNoOverlay('ServiceTask_1.2');
    overlaysPlugin.addOverlays('ServiceTask_1.2', createOverlay('overlay 1'));
    overlaysExpectation.expectOverlays('ServiceTask_1.2', ['overlay 1']);
  });

  test('Remove overlays', () => {
    overlaysExpectation.expectNoOverlay('Activity_1wr0s0r');
    overlaysExpectation.expectNoOverlay('StartEvent_0av7pgo');

    // Create overlays
    overlaysPlugin.addOverlays('Activity_1wr0s0r', [createOverlay('overlay 1.1'), createOverlay('overlay 1.2'), createOverlay('overlay 1.3')]);
    overlaysExpectation.expectOverlays('Activity_1wr0s0r', ['overlay 1.1', 'overlay 1.2', 'overlay 1.3']);
    overlaysPlugin.addOverlays('StartEvent_0av7pgo', createOverlay('overlay 2'));
    overlaysExpectation.expectOverlays('StartEvent_0av7pgo', ['overlay 2']);

    // Remove some overlays
    overlaysPlugin.removeAllOverlays('Activity_1wr0s0r');
    overlaysExpectation.expectNoOverlay('Activity_1wr0s0r');
    // still there
    overlaysExpectation.expectOverlays('StartEvent_0av7pgo', ['overlay 2']);
  });
});
