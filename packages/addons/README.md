# bpmn-visualization-addons

`bpmn-visualization-addons` offers new functionalities to [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js) in the form of addons.


## 📌 Usage

Install `bpmn-visualization-addons` and [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js/):
```shell
npm install @process-analytics/bpmn-visualization-addons bpmn-visualization
```

> [!NOTE]  
> Until version 0.7.1, the `bpmn-visualization-addons` package was available under the name `bv-experimental-add-ons`.
If your application was using the package under its former name, proceed as follows 👇:
```shell
# first uninstall the old package
npm uninstall @process-analytics/bv-experimental-add-ons
# then install the new package
npm install @process-analytics/bpmn-visualization-addons
```
Then, update the imports in your application code to use the new package name as follows 👇:
```diff
- import {BpmnVisualization} from "@process-analytics/bv-experimental-add-ons";
+ import {BpmnVisualization} from "@process-analytics/bpmn-visualization-addons";
```

## 📜 TypeScript Support

The `@process-analytics/bpmn-visualization-addons` npm package includes type definitions, so the integration works out of the box in TypeScript projects and applications.
`bpmn-visualization-addons` requires **TypeScript 4.5** or greater.


## 🎨 Features

### Plugins

The plugins infrastructure provides a way to register extension points.

> [!IMPORTANT]  
> To be able to register and use the plugins, you need to import `BpmnVisualization` from `bpmn-visualization-addons`, and not from `bpmn-visualization`.
```diff
- import {BpmnVisualization} from "bpmn-visualization";
+ import {BpmnVisualization} from "@process-analytics/bpmn-visualization-addons";
```

Example of use:

```ts
import {BpmnVisualization} from "@process-analytics/bpmn-visualization-addons";

const bpmnVisualization = new BpmnVisualization({
    container: 'bpmn-container',
    plugins: [MyPlugin]
});
// Retrieve the plugin by id. The id is defined in the plugin implementation
const myPlugin = bpmnVisualization.getPlugin<MyPlugin>('my-plugin');
myPlugin.aMethod();
```

#### Available plugins

- Plugins providing `BpmnElementsRegistry` methods divided into different categories. This is how `bpmn-visualization` will provide these functionalities
in the future, in order to better separate responsibilities and improve tree-shaking :
  - `CssClassesPlugin`: all methods for manipulating the CSS classes of BPMN elements.
  - `ElementsPlugin`: all methods for retrieving `BpmnElement` and `BpmnSemantic` objects.
  - `OverlaysPlugin`:
    - provides all `BpmnElementsRegistry` methods relating to overlays.
    - ADDITION: let show/hide overlays created with `BpmnElementsRegistry.addOverlays`.
  - `StylePlugin`: all methods for manipulating the style of BPMN elements.
- `StyleByNamePlugin`: provides all `BpmnElementsRegistry` methods for manipulating the style of BPMN elements, identifying the BPMN elements by name.


#### Writing a custom plugin

A plugin is defined as a class:
- It must implement the `Plugin` interface.
- Its constructor must satisfy the `PluginConstructor` type.
- It can provide new methods to extend existing API or introduce new behavior.
- It can implement the optional lifecycle hooks below. They are all called by `BpmnVisualization` and are not intended to be called by client code:
  - `onConfigure`: configure the plugin after construction, once all plugins have been constructed.
  - `onBeforeLoad`: called at the beginning of each `load` call, before the BPMN source is processed.
  - `onLoadSuccess`: called after a `load` call has succeeded.
  - `onLoadError`: called with the thrown error when a `load` call fails, before the error is rethrown to the caller.
  - `onDispose`: called when the `BpmnVisualization` instance is disposed, before the underlying resources are released.

##### Passing options to a plugin with `onConfigure`

`onConfigure` receives the options passed to the `BpmnVisualization` constructor. To pass your own properties in a
type-safe way, use [module augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
to extend the `bpmn-visualization` `GlobalOptions` interface.

To avoid name clashes with `bpmn-visualization` options or with other plugins, wrap your properties in a single
dedicated object named after your plugin (here `myCustomPlugin`):

```ts
import {BpmnVisualization, Plugin} from "@process-analytics/bpmn-visualization-addons";
import type {GlobalOptions} from "bpmn-visualization";

declare module "bpmn-visualization" {
    interface GlobalOptions {
        myCustomPlugin?: {
            property1: string;
        };
    }
}

class MyCustomPlugin implements Plugin {
    getPluginId(): string {
        return "my-custom-plugin";
    }

    onConfigure(options: GlobalOptions): void {
        // read your namespaced options
        const property1 = options.myCustomPlugin?.property1;
        // ... configure the plugin with property1
    }
}

const bpmnVisualization = new BpmnVisualization({
    container: "bpmn-container",
    plugins: [MyCustomPlugin],
    myCustomPlugin: {property1: "a value"}
});
```

##### Reacting to BPMN loading with the load hooks

The `onBeforeLoad`, `onLoadSuccess` and `onLoadError` hooks let a plugin react to each `load` call, so it can keep its own
state in sync with the BPMN model currently rendered. They run around `BpmnVisualization.load`:

- `onBeforeLoad`: runs before the new BPMN source is processed, while the previous model is still rendered. Use it to reset
  state tied to the outgoing model, for example clearing caches, removing overlays or CSS classes, or discarding indexes
  built from the previous diagram.
- `onLoadSuccess`: runs after the new model has been rendered. Use it to (re)build state from the freshly loaded diagram,
  for example indexing elements, registering event listeners, or applying default styles and overlays.
- `onLoadError`: runs with the thrown error when loading fails, before the error is rethrown to the caller. Use it to roll
  back any partial work started in `onBeforeLoad` and to report or log the failure. It does not swallow the error.

`load` can be called several times on the same instance, so these hooks may run more than once. Make sure work done in
`onLoadSuccess` is cleaned up in a later `onBeforeLoad` (or in `onDispose`) to avoid leaking state across loads.

```ts
class MyCustomPlugin implements Plugin {
    getPluginId(): string {
        return "my-custom-plugin";
    }

    onBeforeLoad(): void {
        // reset state tied to the previously loaded model
    }

    onLoadSuccess(): void {
        // build state from the freshly loaded model (indexes, listeners, styles, ...)
    }

    onLoadError(error: unknown): void {
        // roll back partial work and report the failure
        console.error("BPMN load failed", error);
    }
}
```

##### Cleaning up resources with `onDispose`

`onDispose` aligns plugin lifecycle management with the disposal capabilities of the core `bpmn-visualization` library.
Implement it to release everything the plugin acquired, so the `BpmnVisualization` instance can be garbage collected and no
work keeps running after disposal. Typical cleanup includes:

- removing DOM or graph event listeners registered by the plugin;
- clearing timers or intervals (`clearTimeout` / `clearInterval`);
- dropping references to the `BpmnVisualization` instance and to BPMN elements;
- discarding cached data or other internal state held by the plugin.

The hook runs before the core resources are released, so the `BpmnVisualization` instance and the BPMN model are still
accessible if cleanup requires them.

```ts
class MyCustomPlugin implements Plugin {
    private readonly intervalId = setInterval(() => this.refresh(), 1000);

    getPluginId(): string {
        return "my-custom-plugin";
    }

    onDispose(): void {
        clearInterval(this.intervalId);
        // remove listeners, drop references and cached state here as well
    }
}
```


### `BpmnElementsIdentifier`

Convenient tools to know the type/kind of BPMN elements.


### `BpmnElementsSearcher`

`bpmn-visualization` only provides APIs that take BPMN element ids as parameters.
However, there are scenario where the ids in the BPMN source/model have been generated and are unknown by the application.

Instead, the application knows the name of the elements. `BpmnElementsSearcher` provides a way to retrieve elements given their names.

This is useful for example in "Process Discovery" scenario. The elements are identified by name only. Ids may be generated
and not fully linked with the name of the elements.

IMPORTANT: There is no guarantee that names are unique in the BPMN source. In case that there are several matches, `BpmnElementsSearcher` may do filtering (see below).

#### Retrieving `ids`

Once you get the ids of elements related to their names, you can then call regular `bpmn-visualization` API by passing the resulting ids.

Limitations
- If there are several matching names, `BpmnElementsSearcher` returns the first matching identifier.

#### Retrieving the whole `BpmnSemantic`

`BpmnElementsSearcher` also provides a method to retrieve the whole BpmnSemantic objects.

In this case, it allows to provide ways to choose the elements if there are several matches for a given name. See `DeduplicateNamesOptions` for more details.


### Available implementations for `Path Resolution`

**WARNING**: this is front-end processing. It's more efficient for this type of processing to be carried out in the backend.
Use it to bypass the limitations of the tools and algorithms provided in the backend.

The `Path Resolution` infers a BPMN path from elements known to be completed or pending.

#### `PathResolver`

As it is generic and covers general use cases, its capabilities are limited.

It only infers edges/flows given a list of flowNode/shape ids.

#### `CasePathResolver`

Provides path resolution for a single process instance/case.

It is an enhanced implementation of `PathResolver` with resolution options and returns categorized `BpmnSemantic` objects.


## 📃 License

`bpmn-visualization-addons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.
