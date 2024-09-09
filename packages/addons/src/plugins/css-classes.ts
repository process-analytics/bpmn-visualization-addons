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

import type { BpmnVisualization, Plugin } from '../plugins-support';
import type { CssClassesRegistry } from 'bpmn-visualization';

/**
 * Provide CSS classes operations on BPMN elements.
 *
 * This plugin is a wrapper that delegates the actual CSS classes operations to {@link BpmnElementsRegistry}.
 *
 * @since 0.7.0
 */
export class CssClassesPlugin implements Plugin, CssClassesRegistry {
  private readonly cssRegistry: CssClassesRegistry;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.cssRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  getPluginId(): string {
    return 'css';
  }

  addCssClasses(bpmnElementIds: string | string[], classNames: string | string[]): void {
    this.cssRegistry.addCssClasses(bpmnElementIds, classNames);
  }

  removeCssClasses(bpmnElementIds: string | string[], classNames: string | string[]): void {
    this.cssRegistry.removeCssClasses(bpmnElementIds, classNames);
  }

  removeAllCssClasses(bpmnElementIds?: string | string[]): void {
    this.cssRegistry.removeAllCssClasses(bpmnElementIds);
  }

  toggleCssClasses(bpmnElementIds: string | string[], classNames: string | string[]): void {
    this.cssRegistry.toggleCssClasses(bpmnElementIds, classNames);
  }
}
