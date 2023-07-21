# bpmn-visualization experimental add-ons

Experimental add-ons for `bpmn-visualization`.


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



describe initial use cases covered and why (see description in
[FEAT] Add a new experimental API to get a edge/node by name bpmn-visualization-js#2453)
mention limitations

PathResolver

describe initial use cases covered and why
frontend processing, probably more efficient if done in backend. Workaround the limitation of the tools and algorithms provided in backend


### 📌 Usage in applications and projects

Install `bv-experimental-add-ons`:
```shell script
npm i @process-analytics/bv-experimental-add-ons
```

Also install [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js/).


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.
