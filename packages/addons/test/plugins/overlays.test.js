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

import { describe, expect, test } from '@jest/globals';
import { BpmnVisualization, OverlaysPlugin } from '../../dist/index.js';
import { insertBpmnContainerWithoutId } from '../shared/dom-utils.js';
import { readFileSync } from '../shared/io-utils.js';

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
  /**
   * @param bpmnVisualization {BpmnVisualization}
   */
  constructor(bpmnVisualization) {
    this.bpmnContainer = bpmnVisualization.graph.container;
  }
  getElementsContainer() {
    return this.bpmnContainer.querySelector('svg:nth-child(1) > g:nth-child(1) > g:nth-child(2)');
  }

  getOverlaysContainer() {
    return this.bpmnContainer.querySelector('svg:nth-child(1) > g:nth-child(1) > g:nth-child(3)');
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

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });

  test('Hide then show overlays', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
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

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible(false);
    plugin.setVisible();
    expect(overlaysContainer).toHaveStyle('display: inherit');
  });

  test('Restore the original display style of the overlays container after setting visibility to false twice then true)', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    const overlaysContainer = new ContainersRetriever(bpmnVisualization).getOverlaysContainer();
    overlaysContainer.style.display = 'inherit';
    expect(overlaysContainer).toHaveStyle('display: inherit');

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
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

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible();
    expect(overlaysContainer).toHaveStyle('display: inherit');
  });

  test('Hide overlays several times in a raw', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible(false);
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });

  test('Show overlays several times in a raw', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible();
    plugin.setVisible(true);
    plugin.setVisible();
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).toBeVisible();
  });

  test('Hide, show then hide overlays', () => {
    const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [OverlaysPlugin] });
    bpmnVisualization.load(readFileSync('./fixtures/bpmn/1_pool_custom_colors_with_1_text-annotation.bpmn'));

    /** @type OverlaysPlugin*/
    const plugin = bpmnVisualization.getPlugin('overlays');
    plugin.setVisible(false);
    plugin.setVisible();
    plugin.setVisible(false);
    expect(new ContainersRetriever(bpmnVisualization).getOverlaysContainer()).not.toBeVisible();
  });
});
