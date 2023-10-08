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

import { BpmnVisualization as BaseBpmnVisualization, type GlobalOptions as BaseGlobalOptions } from 'bpmn-visualization';

export type PluginConstructor = new (bpmnVisualization: BpmnVisualization, options: GlobalOptions) => Plugin;

export interface Plugin {
  getPluginId(): string;
}

/**
 * Let pass plugins configuration to {@link BpmnVisualization}.
 *
 * Use this type if you already have a dedicated custom `GlobalOptions` type extending the bpmn-visualization `GlobalOptions` type.
 * In this case, proceed as in the following example to add the plugins configuration to the custom `GlobalOptions`.
 *
 * ```ts
 * // Assuming you have a `CustomGlobalOptions`
 * type GlobalOptionsWithPluginsSupport = CustomGlobalOptions & PluginOptionExtension;
 * ```
 *
 * If you don't extend `GlobalOptions`, use {@link GlobalOptions} directly.
 */
export type PluginOptionExtension = {
  plugins?: PluginConstructor[];
};

export type GlobalOptions = BaseGlobalOptions & PluginOptionExtension;

export class BpmnVisualization extends BaseBpmnVisualization {
  private readonly plugins: Map<string, Plugin> = new Map();

  constructor(options: GlobalOptions) {
    super(options);

    for (const constructor of options.plugins ?? []) {
      const plugin = new constructor(this, options);
      const pluginId = plugin.getPluginId();
      if (this.plugins.has(pluginId)) {
        throw new Error(`Plugin loading fails. It is not possible to register multiple plugins with the same '${pluginId}' identifier.`);
      }
      this.plugins.set(pluginId, plugin);
    }
  }

  getPlugin<T extends Plugin>(id: string): T {
    return this.plugins.get(id) as T;
  }
}
