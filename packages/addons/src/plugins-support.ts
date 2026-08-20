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
 *   - {@link Plugin.onBeforeLoad} / {@link Plugin.onLoadSuccess} / {@link Plugin.onLoadError}: on each
 *     {@link BpmnVisualization.load} call
 *   - {@link Plugin.onDispose}: when the {@link BpmnVisualization} instance is disposed
 *
 * Hooks are called in registration order, that is the order of the `plugins` option.
 *
 * A hook that throws cannot break the host nor the other plugins: the error is caught, the remaining plugins still
 * receive the hook, and the failures of one dispatch are reported together with `console.error`. A plugin that needs
 * to react to its own failure has to handle it inside its hook.
 *
 * Construction is the exception, because it is not a hook. A plugin constructor or a {@link Plugin.getPluginId}
 * implementation that throws aborts the whole registration, and the error reaches the caller of the
 * {@link BpmnVisualization} constructor, which gets no instance. Nothing leaks: the plugins already registered receive
 * {@link Plugin.onDispose} and the core resources are released before the error is rethrown. So a plugin whose set-up
 * can fail either throws, making the misconfiguration fatal for the whole visualization, or defers that set-up to
 * {@link Plugin.onConfigure}, whose failure is isolated like any other hook failure.
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
   *
   * It runs at most once per instance: a second call to {@link BpmnVisualization.dispose} does not call it again.
   *
   * Do not call {@link BpmnVisualization.dispose} from this hook, on the instance the plugin was constructed with.
   * That nested call is the one that reaches the core disposal first, so the underlying resources are released in
   * the middle of the dispatch and the plugins registered after this one run against a destroyed graph.
   *
   * It also runs when the registration of a later plugin fails, so that the plugins already constructed release what
   * they acquired instead of leaking with the discarded instance. On that path {@link Plugin.onConfigure} has not run,
   * so an implementation must not assume it did.
   * @since 0.10.0
   */
  onDispose?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} at the beginning of each {@link BpmnVisualization.load} call,
   * before the BPMN source is processed.
   * It is not intended to be called by client code.
   *
   * Runs while the previous model is still rendered. Implement it to reset state tied to the outgoing model, for example
   * clearing caches, removing overlays or CSS classes, or discarding indexes built from the previous diagram.
   *
   * {@link BpmnVisualization.load} can be called several times on the same instance, so this hook may run more than
   * once.
   * @since 0.10.0
   */
  onBeforeLoad?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} after a {@link BpmnVisualization.load} call has succeeded. It is
   * not called when the load fails; in that case, {@link Plugin.onLoadError} is called instead. It is not intended to
   * be called by client code.
   *
   * Runs after the new model has been rendered. Implement it to (re)build state from the freshly loaded diagram, for example
   * indexing elements, registering event listeners, or applying default styles and overlays. Clean up this work in a later
   * {@link Plugin.onBeforeLoad} or in {@link Plugin.onDispose} to avoid leaking state across loads.
   * @since 0.10.0
   */
  onLoadSuccess?: () => void;

  /**
   * Lifecycle hook called by {@link BpmnVisualization} when a {@link BpmnVisualization.load} call fails, before the
   * error is rethrown to the caller. It is not intended to be called by client code.
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

/**
 * The lifecycle hooks {@link BpmnVisualization} dispatches, derived from {@link Plugin} rather than listed again, so
 * that adding a hook to the interface cannot leave the dispatch out of step with it.
 *
 * Exported so that the tests share this definition instead of restating it. `stripInternal` keeps it out of the
 * published declarations, so it is not part of the public API.
 * @internal
 */
export type PluginHookName = Exclude<keyof Plugin, 'getPluginId'>;

/** A plugin hook that threw, kept so that every failure of a single dispatch can be reported together. */
interface PluginHookFailure {
  pluginId: string;
  error: unknown;
}

export class BpmnVisualization extends BaseBpmnVisualization {
  private readonly plugins = new Map<string, Plugin>();
  // Not named `disposed`: the base class defines an own property with that name at runtime, and redeclaring it here
  // would overwrite it and defeat its own idempotency guard.
  private pluginsDisposed = false;

  constructor(options: GlobalOptions) {
    super(options);
    try {
      this.registerPlugins(options);
    } catch (error) {
      // `super(options)` has already built the graph and its listeners. The instance is about to be discarded, so
      // release them instead of leaking them. `super.dispose()` rather than `this.dispose()`, because `dispose` is
      // overridable and a subclass override would run here before its own fields are initialized.
      this.disposePlugins();
      super.dispose();
      throw error;
    }
  }

  override dispose(): void {
    // No guard needed here: `disposePlugins` has its own, and the core `dispose` also runs at most once. What neither
    // guard covers is the ordering when a plugin calls `dispose()` on this instance from its own `onDispose`: that
    // nested call reaches the core first and destroys the graph mid-dispatch. Documented on `Plugin.onDispose` rather
    // than prevented, since a hook disposing the instance that is disposing it is not a supported pattern.
    this.disposePlugins();
    super.dispose();
  }

  override load(xml: string, options?: LoadOptions): void {
    this.forEachPlugin('onBeforeLoad', plugin => plugin.onBeforeLoad?.());
    try {
      super.load(xml, options);
    } catch (error) {
      this.forEachPlugin('onLoadError', plugin => plugin.onLoadError?.(error));
      throw error;
    }
    this.forEachPlugin('onLoadSuccess', plugin => plugin.onLoadSuccess?.());
  }

  /**
   * Retrieve a plugin registered on this instance.
   *
   * @param id The identifier of the plugin, as returned by its {@link Plugin.getPluginId} implementation.
   * @returns The plugin registered with this identifier, or `undefined` when no plugin has been registered with it.
   */
  getPlugin<T extends Plugin>(id: PluginIds): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  private readonly registerPlugins = (options: GlobalOptions): void => {
    // construct
    for (const constructor of options.plugins ?? []) {
      const plugin = new constructor(this, options);
      const pluginId = plugin.getPluginId();
      if (this.plugins.has(pluginId)) {
        // This instance is fully constructed but never enters the map, so `disposePlugins` cannot reach it. Give it
        // its `onDispose` here, and report rather than throw, so that it cannot mask the duplicate identifier error.
        this.callPluginsHook('onDispose', [[pluginId, plugin]], toDispose => toDispose.onDispose?.());
        throw new Error(`Plugin loading fails. It is not possible to register multiple plugins with the same '${pluginId}' identifier.`);
      }
      this.plugins.set(pluginId, plugin);
    }

    // configure
    this.forEachPlugin('onConfigure', plugin => plugin.onConfigure?.(options));
  };

  private readonly disposePlugins = (): void => {
    if (this.pluginsDisposed) {
      return;
    }
    // Set before dispatching, so that a plugin calling `dispose()` on this instance from its own `onDispose` cannot
    // recurse. Errors are isolated by `forEachPlugin`, so this cannot leave the instance in a state where disposal
    // never completes.
    this.pluginsDisposed = true;
    this.forEachPlugin('onDispose', plugin => plugin.onDispose?.());
    // Release the instances, so that the host stops keeping them alive and `getPlugin` stops handing out dead ones.
    this.plugins.clear();
  };

  private readonly forEachPlugin = (hookName: PluginHookName, functor: (plugin: Plugin) => void): void => {
    this.callPluginsHook(hookName, this.plugins, functor);
  };

  /**
   * Call one hook on the given plugins, letting every plugin run even when another one throws. Failures are collected
   * and reported once: a plugin must not be able to break the host, nor the plugins registered after it.
   */
  private readonly callPluginsHook = (hookName: PluginHookName, plugins: Iterable<[string, Plugin]>, functor: (plugin: Plugin) => void): void => {
    const failures: PluginHookFailure[] = [];
    for (const [pluginId, plugin] of plugins) {
      try {
        functor(plugin);
      } catch (error) {
        failures.push({ pluginId, error });
      }
    }
    if (failures.length > 0) {
      // Reporting to the console is a first implementation, and the intended default rather than the only option.
      // What to do with a failing plugin is the consumer's decision, not this package's: a later version can accept a
      // handler receiving these failures, so that the caller retrieves them and chooses, whether that is logging
      // differently, surfacing them in the interface, counting them, or rethrowing. This stays the fallback when no
      // handler is provided.
      console.error(`[bv-addons] Errors thrown by the '${hookName}' hook of ${failures.length} plugin(s). They have been ignored to let the other plugins run.`, failures);
    }
  };
}
