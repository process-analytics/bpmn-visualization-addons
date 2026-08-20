---
status: draft
date: 2026-06-24
---

# Plugin support for BpmnVisualization

## Context and Problem Statement

`bpmn-visualization-addons` extends [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js) with extra functionalities (CSS classes manipulation, overlays management, style manipulation, element search by name, etc.).

These functionalities share two properties:

- They are **optional**. Most consumers of `bpmn-visualization` do not need them, and bundling them unconditionally into the core library would increase its size and surface for every user.
- They are **driven by the Process Analytics project**, which is a member of the `bpmn-visualization` community rather than the core maintainer of every feature. We need a way to ship and iterate on these features outside the core release cycle, while keeping them cleanly composable with the core.

The core `BpmnVisualization` class does not provide an extension mechanism that lets third parties attach new behavior in a structured, per-instance, opt-in way.

How do we add optional, independently released features to `BpmnVisualization` without coupling them to the core library or forking it?

## Decision Drivers

- Keep optional features out of the core library.
- Let consumers opt in only to the features they need.
- Allow several independent features to coexist on the same visualization instance.
- Give each feature a place to run initialization logic once the instance is ready.
- Let each feature react to the `BpmnVisualization` lifecycle (load and disposal) without any client code wiring.
- Allow the Process Analytics project to develop, version, and release these features independently of the core release cycle.

## Considered Options

1. **Plugin system on top of an extended `BpmnVisualization`** (chosen).
2. **Fork or monkey-patch the core `BpmnVisualization`** to inject behavior.
3. **Push every addon into the core `bpmn-visualization` library**.

## Decision Outcome

Chosen option: **"Plugin system on top of an extended `BpmnVisualization`"**, because it keeps optional features opt-in and decoupled from the core, lets independent features coexist, and gives each feature a clear initialization point, while the other options either are fragile (fork/monkey-patch) or couple optional features to the core (push into core).

The plugin system is implemented in `packages/addons/src/plugins-support.ts`:

- The addons package exports its own `BpmnVisualization` class, which extends the one from `bpmn-visualization`. Consumers import `BpmnVisualization` from `@process-analytics/bpmn-visualization-addons` instead of from `bpmn-visualization` to gain plugin support.
- A `Plugin` interface defines the contract every plugin implements. Only `getPluginId()` is mandatory; every other hook is optional and is called by `BpmnVisualization`, not by client code:
  - `getPluginId()` returns a unique identifier. Registering two plugins with the same id fails fast with an explicit error.
  - `onConfigure(options)` runs once, after all plugins have been constructed. Implement it to configure the plugin from the `GlobalOptions` passed to the instance.
  - `onBeforeLoad()` runs at the beginning of each `load` call, before the BPMN source is processed and while the previous model is still rendered. Implement it to reset state tied to the outgoing model.
  - `onLoadSuccess()` runs after a `load` call has succeeded and the new model has been rendered. Implement it to (re)build state from the freshly loaded diagram.
  - `onLoadError(error)` runs when a `load` call fails, before the error is rethrown to the caller. Implement it to roll back partial work; it does not swallow the error.
  - `onDispose()` runs when the instance is disposed, before the underlying core resources are released, so the instance and the BPMN model are still accessible. Implement it to release everything the plugin acquired.
- Plugins are passed to the constructor through `options.plugins`. They are instantiated with `(bpmnVisualization, options)` and stored in a per-instance registry.
- Consumers retrieve a plugin with `getPlugin<PluginType>(pluginId)` and then call its methods. The lookup returns `undefined` when no plugin is registered with this id.

The plugin lifecycle is therefore:

1. **construct**: each plugin class in `options.plugins` is instantiated and registered by its id.
2. **onConfigure**: once all plugins are registered, the optional `onConfigure(options)` hook of each plugin is invoked.
3. **load hooks**: on each `load` call, `onBeforeLoad` fires before processing the BPMN source, then either `onLoadSuccess` (on success) or `onLoadError(error)` (on failure, before the error is rethrown). `load` can be called several times, so these hooks may run more than once.
4. **onDispose**: when the instance is disposed, `onDispose` fires before the core resources are released. It fires at most once per instance, and also when the registration of a later plugin fails, so that the plugins already constructed release what they acquired rather than leaking with the discarded instance.

At every step, a hook that throws is caught and reported rather than propagated: one plugin must not be able to break the visualization, nor the plugins registered after it.

Construction is deliberately left out of that rule. A plugin constructor that throws, like a duplicated plugin id, is a configuration error rather than a runtime incident, so it aborts the construction and reaches the caller, after the plugins already registered have been disposed and the core resources released.

The features provided by the addons package (`CssClassesPlugin`, `ElementsPlugin`, `OverlaysPlugin`, `StylePlugin`, `StyleByNamePlugin`) are implemented as plugins on top of this infrastructure.

### Consequences

- Good, because optional features stay out of the core library and are opt-in per visualization instance.
- Good, because multiple independent features can be combined on a single instance without conflicting, thanks to unique plugin ids.
- Good, because the Process Analytics project can develop, version, and release these addons independently of the core `bpmn-visualization` release cycle.
- Good, because the model mirrors how `bpmn-visualization` intends to expose functionalities in the future (responsibilities split into dedicated units, better tree-shaking), so addons act as a testing ground for that direction.
- Good, because each plugin has a clear initialization point through the `onConfigure` lifecycle hook.
- Good, because plugins can react to the load and disposal lifecycle (`onBeforeLoad`, `onLoadSuccess`, `onLoadError`, `onDispose`) without any client code wiring, so they can reset, rebuild, or release their state in step with the instance.
- Bad, because consumers must import `BpmnVisualization` from the addons package, not from `bpmn-visualization`. Mixing the two imports is a common pitfall.
- Bad, because the addons `BpmnVisualization` is tied to the core class through inheritance, so it must stay compatible with the core API and its declared peer dependency range.
- Bad, because plugin ids form a shared namespace, and collisions are only detected at registration time (runtime), not at compile time.

## Pros and Cons of the Options

### Plugin system on top of an extended `BpmnVisualization`

- Good, because optional features are opt-in and decoupled from the core.
- Good, because independent features compose on the same instance.
- Good, because features can be released independently of the core.
- Neutral, because it relies on inheritance from the core class.
- Bad, because consumers must import `BpmnVisualization` from the addons package.
- Bad, because plugin id collisions are detected only at runtime.

### Fork or monkey-patch the core `BpmnVisualization`

- Good, because it requires no explicit extension point in the core.
- Bad, because it is fragile and breaks easily when the core changes.
- Bad, because it is hard to maintain and to combine multiple independent features.

### Push every addon into the core `bpmn-visualization` library

- Good, because consumers have a single import and no separate package.
- Bad, because it couples optional features to the core and increases its size and surface for every user.
- Bad, because it forces optional features into the core release cycle, contradicting the goal of separation of responsibilities and improved tree-shaking.

## More Information

- Plugin usage and the list of available plugins: [`packages/addons/README.md`](../../packages/addons/README.md).
- Implementation: `packages/addons/src/plugins-support.ts`.
