/*
Copyright 2024 Bonitasoft S.A.

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
import type { StyleRegistry, StyleUpdate } from 'bpmn-visualization';

import { BpmnElementsSearcher } from '../bpmn-elements.js';

/**
 * Provide style operations on BPMN elements.
 *
 * This plugin is a wrapper that delegates the actual style operations to {@link BpmnElementsRegistry}.
 *
 * @since 0.7.0
 */
export class StylePlugin implements Plugin, StyleRegistry {
  private readonly styleRegistry: StyleRegistry;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.styleRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  getPluginId(): string {
    return 'style';
  }

  updateStyle(bpmnElementIds: string | string[], styleUpdate: StyleUpdate): void {
    this.styleRegistry.updateStyle(bpmnElementIds, styleUpdate);
  }

  resetStyle(bpmnElementIds?: string | string[]): void {
    this.styleRegistry.resetStyle(bpmnElementIds);
  }
}

/**
 * @since 0.7.0
 */
export interface StyleRegistryByName extends StyleRegistry {
  /**
   * Update the style of the BPMN elements with the given names.
   *
   * See {@link StyleRegistry.updateStyle} for more details.
   *
   * @param bpmnElementNames The name of the BPMN element(s) whose style must be updated.
   * @param styleUpdate The style properties to update.
   */
  updateStyle(bpmnElementNames: string | string[], styleUpdate: StyleUpdate): void;

  /**
   * Reset the style of the BPMN elements with the given names.
   *
   * See {@link StyleRegistry.resetStyle} for more details.
   *
   * @param bpmnElementNames The name of the BPMN element(s) whose style must be reset. When passing a nullish parameter, the style of all BPMN elements will be reset. Passing an empty array has no effect.
   */
  resetStyle(bpmnElementNames?: string | string[]): void;
}

/**
 * Provide style operations on BPMN elements, identifying them by name.
 *
 * This plugin is a wrapper that delegates the actual style operations to {@link BpmnElementsRegistry}.
 * It uses the {@link BpmnElementsSearcher} to map names to ids.
 *
 * **IMPORTANT**: The mapping is currently not cached, nor pre-fetched after the BPMN source has been loaded.
 * So the implementation is not very effective. Caching and pre-fetch features will be implemented in the future.
 * See https://github.com/process-analytics/bv-experimental-add-ons/issues/4 for improvement.
 *
 * @since 0.7.0
 */
export class StyleByNamePlugin implements Plugin, StyleRegistryByName {
  private readonly searcher: BpmnElementsSearcher;
  private readonly styleRegistry: StyleRegistry;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.searcher = new BpmnElementsSearcher(bpmnVisualization.bpmnElementsRegistry);
    this.styleRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  getPluginId(): string {
    return 'style-by-name';
  }

  updateStyle(bpmnElementNames: string | string[], styleUpdate: StyleUpdate): void {
    const bpmnElements = this.searcher.getElementsByNames(bpmnElementNames as Array<string>);
    this.styleRegistry.updateStyle(
      bpmnElements.map(bpmnElement => bpmnElement.id),
      styleUpdate,
    );
  }

  resetStyle(bpmnElementNames?: string | string[]): void {
    if (!bpmnElementNames) {
      this.styleRegistry.resetStyle();
      return;
    }
    const bpmnElements = this.searcher.getElementsByNames(bpmnElementNames as Array<string>);
    this.styleRegistry.resetStyle(bpmnElements.map(bpmnElement => bpmnElement.id));
  }
}
