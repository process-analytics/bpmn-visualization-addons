# bpmn-visualization-addons

`bpmn-visualization-addons` offers new functionalities to [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js) in the form of addons.


## 📌 Usage

Install `bpmn-visualization-addons` and [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js/):
```shell script
npm i @process-analytics/bv-experimental-add-ons bpmn-visualization
```


## 📜 TypeScript Support

The `@process-analytics/bv-experimental-add-ons` npm package includes type definitions, so the integration works out of the box in TypeScript projects and applications.
`bpmn-visualization-addons` requires **TypeScript 4.5** or greater.


## 🎨 Features

### Plugins

The plugins infrastructure provides a way to register extension points.

> [!IMPORTANT]  
> To be able to register and use the plugins, you need to import `BpmnVisualization` from the `addons` package, and not from `bpmn-visualization`.
```diff
- import {BpmnVisualization} from "bpmn-visualization";
+ import {BpmnVisualization} from "@process-analytics/bv-experimental-add-ons";
```

Example of use:

```ts
import {BpmnVisualization} from "@process-analytics/bv-experimental-add-ons";

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
- It can implement the `configure` method to configure the plugin after construction.
- It can provide new methods to extend existing API or introduce new behavior .


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


### `ShapeUtil`

Add new methods to the `ShapeUtil` class provided by `bpmn-visualization`. 


## 📃 License

`bpmn-visualization-addons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.
