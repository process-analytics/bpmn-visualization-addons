# bpmn-visualization experimental add-ons

Experimental add-ons for [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js).


## 🎨 Features

### `BpmnElementsIdentifier`

Convenient tools to know the type/kind of BPMN elements.


### `BpmnElementsSearcher`

`bpmn-visualization`only provides APIs that take BPMN element ids as parameters.
However, there are scenario where the ids in the BPMN source/model have been generated and are unknown by the application.

Instead, the app knows the name of the elements. `BpmnElementsSearcher` provides a way to retrieve the ids of elements related to their names.

This is useful for example in "Process Discovery" scenario. The elements are identified by name only. Ids may be generated
and not fully linked with the name of the elements.

Limitations
- There is no guarantee that names are unique in the BPMN source. In case that there are several matches, `BpmnElementsSearcher` returns the first matching id.


### `PathResolver`

Infer paths. Currently, only infer edges/flows given a list of flow node ids.

**WARNING**: this is front-end processing. It's more efficient for this type of processing to be carried out in the backend.
Use it to bypass the limitations of the tools and algorithms provided in the backend.


### `ShapeUtil`

Add new methods to the `ShapeUtil` class provided by `bpmn-visualization`. 


## 📌 Usage
<!-- ### 📌 Usage in applications and projects -->

Install `bv-experimental-add-ons`:
```shell script
npm i @process-analytics/bv-experimental-add-ons
```

Also install [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js/).


## 📜 TypeScript Support

The `@process-analytics/bv-experimental-add-ons` npm package includes type definitions, so the integration works out of the box in TypeScript projects.
`bv-experimental-add-ons` requires **TypeScript 4.5** or greater.


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.
