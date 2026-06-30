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

import { BpmnVisualization as BaseBpmnVisualization, type LoadOptions, type GlobalOptions } from 'bpmn-visualization';

/**
 * Enforce the Plugin constructor signature.
 * Inspired from https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes (deprecated page, but sill working).
 */
export type PluginConstructor = new (bpmnVisualization: BpmnVisualization, options: GlobalOptions) => Plugin;

/**
 * Plugin lifecycle. All hooks except {@link Plugin.getPluginId} are optional and are called by {@link BpmnVisualization},
 * not by client code:
 *   - construct
 *   - {@link Plugin.onConfigure}: once, after all plugins have been constructed
 *   - {@link Plugin.onBeforeLoad} / {@link Plugin.onLoadSuccess} / {@link Plugin.onLoadError}: on each `load` call
 *   - {@link Plugin.onDispose}: when the {@link BpmnVisualization} instance is disposed
 */
export interface Plugin {
  /** Returns the unique identifier of the plugin. It is not possible to use several plugins having the same identifier. */
  getPluginId(): string;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} after all plugins have been constructed. It is not intended to be called by client code.
   *
   * Implement this method to configure the plugin after initialization.
   * @param options The options passed to the BpmnVisualization instance, used to configure the plugin.
   */
  onConfigure?: (options: GlobalOptions) => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} when the instance is disposed, before the underlying resources are released.
   * It is not intended to be called by client code.
   *
   * This hook aligns plugin lifecycle management with the disposal capabilities of the core `bpmn-visualization` library.
   * Implement it to release everything the plugin acquired so the `BpmnVisualization` instance can be garbage collected and
   * no work continues after disposal. Typical cleanup includes:
   *   - removing DOM or graph event listeners registered by the plugin;
   *   - clearing timers or intervals (`clearTimeout` / `clearInterval`);
   *   - dropping references to the {@link BpmnVisualization} instance and to BPMN elements;
   *   - discarding cached data or other internal state held by the plugin.
   *
   * It runs before the core resources are released, so the {@link BpmnVisualization} instance and the BPMN model are still
   * accessible if cleanup requires them.
   * @since 0.10.0
   */
  onDispose?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} at the beginning of each `load` call, before the BPMN source is processed.
   * It is not intended to be called by client code.
   *
   * Runs while the previous model is still rendered. Implement it to reset state tied to the outgoing model, for example
   * clearing caches, removing overlays or CSS classes, or discarding indexes built from the previous diagram.
   *
   * `load` can be called several times on the same instance, so this hook may run more than once.
   * @since 0.10.0
   */
  onBeforeLoad?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} after a `load` call has succeeded. It is not called when the load fails;
   * in that case, {@link Plugin.onLoadError} is called instead. It is not intended to be called by client code.
   *
   * Runs after the new model has been rendered. Implement it to (re)build state from the freshly loaded diagram, for example
   * indexing elements, registering event listeners, or applying default styles and overlays. Clean up this work in a later
   * {@link Plugin.onBeforeLoad} or in {@link Plugin.onDispose} to avoid leaking state across loads.
   * @since 0.10.0
   */
  onLoadSuccess?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} when a `load` call fails, before the error is rethrown to the caller.
   * It is not intended to be called by client code.
   *
   * Implement it to roll back any partial work started in {@link Plugin.onBeforeLoad} and to report or log the failure.
   * It does not swallow the error: the original error is still rethrown to the caller.
   * @param error The error thrown while loading the BPMN source.
   * @since 0.10.0
   */
  onLoadError?: (error: unknown) => void;
}

declare module 'bpmn-visualization' {
  /**
   * Augment the bpmn-visualization `GlobalOptions` interface to pass plugins configuration to {@link BpmnVisualization}.
   *
   * Importing anything from `bpmn-visualization-addons` makes the `plugins` property available on the standard
   * `GlobalOptions` type provided by `bpmn-visualization`.
   */
  interface GlobalOptions {
    /** The plugins to register on the {@link BpmnVisualization} instance. */
    plugins?: PluginConstructor[];
  }
}

/**
 * The identifiers of the plugins provided by `bpmn-visualization-addons`.
 * @since 0.7.0
 */
export type DefaultPlugins = 'css' | 'elements' | 'overlays' | 'style' | 'style-by-name';
/**
 * All possible identifiers that can be used to identify a plugin.
 * @since 0.7.0
 */
export type PluginIds = DefaultPlugins | (string & Record<never, never>);

export class BpmnVisualization extends BaseBpmnVisualization {
  private readonly plugins = new Map<string, Plugin>();

  constructor(options: GlobalOptions) {
    super(options);
    this.registerPlugins(options);
  }

  override dispose(): void {
    this.forEachPlugin(plugin => plugin.onDispose?.());
    super.dispose();
  }

  override load(xml: string, options?: LoadOptions): void {
    this.forEachPlugin(plugin => plugin.onBeforeLoad?.());
    try {
      super.load(xml, options);
    } catch (error) {
      this.forEachPlugin(plugin => plugin.onLoadError?.(error));
      throw error;
    }
    this.forEachPlugin(plugin => plugin.onLoadSuccess?.());
  }

  getPlugin<T extends Plugin>(id: PluginIds): T {
    return this.plugins.get(id) as T;
  }

  private readonly registerPlugins = (options: GlobalOptions): void => {
    // construct
    for (const constructor of options.plugins ?? []) {
      const plugin = new constructor(this, options);
      const pluginId = plugin.getPluginId();
      if (this.plugins.has(pluginId)) {
        throw new Error(`Plugin loading fails. It is not possible to register multiple plugins with the same '${pluginId}' identifier.`);
      }
      this.plugins.set(pluginId, plugin);
    }

    // configure
    for (const plugin of this.plugins.values()) {
      plugin.onConfigure?.(options);
    }
  };

  private readonly forEachPlugin = (functor: (plugin: Plugin) => void): void => {
    for (const plugin of this.plugins.values()) {
      functor(plugin);
    }
  };
}
