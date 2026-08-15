# Working notes: lifecycle hooks and event systems across the surveyed libraries

**Status: temporary working file, to be deleted from the branch.** It exists to carry raw research forward into a
later comparison of lifecycle hooks and event systems, so that work does not restart from zero.

**Provenance and trust level.** Extracted from the parallel research done on 13 and 14 August 2026 for
[`bv-addons_plugin_system_analysis_94519a2.md`](./bv-addons_plugin_system_analysis_94519a2.md). Versions and source
branches are in that document's "Versions and sources" table and are not repeated here.

Claims that the analysis relies on were spot-checked against source. **Everything else here was not**, in particular
enumerated hook lists and event names. Treat this file as leads to verify, not as findings. Nothing here should be
quoted into a deliverable without re-checking it.

---

## 1. This package, for reference

Five hooks, `plugins-support.ts:43-95`, all optional except the id.

| Hook | Called at | Args | Errors caught |
|---|---|---|---|
| constructor | inside the `BpmnVisualization` constructor, after `super(options)` | `(bpmnVisualization, options)` | no |
| `onConfigure` | after **all** plugins are constructed | full `GlobalOptions` | no |
| `onBeforeLoad` | start of every `load`, before parsing | none | no |
| `onLoadSuccess` | after `super.load` returns | none | no |
| `onLoadError` | in the `catch`, before rethrow | the error | no |
| `onDispose` | in `dispose()`, **before** `super.dispose()` | none | no |

Ordering is `Map` insertion order, i.e. `options.plugins` array order. Not documented, not asserted by any test.
No event bus. No interception. No way for a plugin to veto or modify anything. No error isolation: a throwing
`onDispose` prevents `super.dispose()` entirely.

---

## 2. Event-bus designs

### bpmn-js / diagram-js

The reference implementation for this axis. `EventBus` is an ordinary service, retrieved by id.

- API: `on(events, priority, callback, that)`, `once`, `off`, `fire`. **Default priority 1000, higher runs first.**
- **Interception is first-class**: `event.stopPropagation()`, `event.preventDefault()`, and a non-`undefined` return
  value halts the chain and becomes the result. This is what makes rules and behaviors composable, and it is what
  LogicFlow lacks.
- Some events are transform points, not notifications: `xml = this._emit('import.parse.start', { xml }) || xml;`, so
  a listener can rewrite the XML or the definitions.
- Module-level lifecycle: `__init__` only, an array of service ids to instantiate eagerly. **There is no
  `__destroy__`.** Cleanup is per-service, by subscribing to `diagram.destroy` in its own constructor, e.g.
  `eventBus.on('diagram.destroy', 1, this._destroy, this)` in EventBus itself, priority 500 in Canvas.
- Known gap: the injector is never torn down and its instance cache is never cleared, so a module allocating timers or
  listeners leaks unless it registers its own `diagram.destroy` handler. Nothing prompts it to.

Event inventory found (diagram-js core is only three): `diagram.init`, `diagram.clear`, `diagram.destroy`;
`canvas.init`, `canvas.destroy`, `canvas.resized`, `canvas.viewbox.changing`, `canvas.viewbox.changed`,
`canvas.focus.changed`, `canvas.mouseover`, `canvas.mouseout`; bpmn-js import: `import.parse.start`,
`import.parse.complete`, `import.render.start`, `import.render.complete`, `import.done`; export and DOM:
`saveXML.start`, `saveXML.serialized`, `saveXML.done`, `saveSVG.start`, `saveSVG.done`, `attach`, `detach`.

`diagram.init` is documented as "an event indicating that all plug-ins are loaded. Use this event to fire other events
to interested plug-ins."

### LogicFlow

Same shape, much weaker instrument. Plugins use the ordinary public `lf.on/once/off/emit`, delegating to
`graphModel.eventCenter`, an `EventEmitter`.

- `on(evt, callback, once?)` **splits on commas**: `lf.on('node:click,edge:click', cb)` works.
- A **`'*'` wildcard** listener receives every emit.
- Fully synchronous, subscription order, and **no propagation control at all**: no priority, no `stopPropagation`, no
  `preventDefault`, no return-value handling, no async. Just `callback.apply(this, [eventArgs])`.
- Consequence: plugins can observe and add, never intercept or override each other. Interception lives in two
  unrelated APIs instead: the `guards` option (`beforeClone`, `beforeDelete`) and model-level
  `getConnectedSourceRules` / `getConnectedTargetRules`.
- **Typing dead end**: `EventArgs` is a `type` alias intersection, not an interface, so it cannot be augmented by
  declaration merging and a plugin can never contribute typed event names. The overload pair falls back to `any` for
  unknown names, by design: "this part of the type definition is guaranteed by the user".
- Plugin hooks are three: `constructor({ lf, LogicFlow, props, options })`, `render(lf, toolOverlay)`, `destroy()`.
  **`render` is called by the `ToolOverlay` preact component**, not by LogicFlow, from `componentDidMount` and
  `componentDidUpdate`, and the queue is cleared afterwards so it runs once. A plugin that subscribes in `render` is
  inert until the consumer calls `lf.render()`.
- Three unranked ways for a plugin to expose an action: emit new events, expose methods on the instance reachable via
  `lf.extension.<name>`, or monkey-patch methods onto `lf` (sanctioned by `[propName: string]: any`; the Snapshot
  plugin adds `lf.getSnapshot`).

### ECharts

- Named lifecycle events on a **single module-global `Eventful`**: `afterinit`, `coordsys:aftercreate`,
  `series:beforeupdate`, `series:layoutlabels`, `series:transition`, `series:afterupdate`, `afterupdate`.
- `registerPostInit` = `registerUpdateLifecycle('afterinit', fn)`, `registerPostUpdate` = same for `'afterupdate'`.
- Because the `Eventful` is global, **hooks registered by an installer fire for every chart on the page**, with the
  instance passed as an argument, and they survive `chart.dispose()`. There is no uninstall.
- Installer surface (what an extension can hook into): `registerPreprocessor`, `registerProcessor`, `registerPostInit`,
  `registerPostUpdate`, `registerUpdateLifecycle`, `registerAction`, `registerCoordinateSystem`, `registerLayout`,
  `registerVisual`, `registerTransform`, `registerLoading`, `registerMap`, `registerImpl`, `PRIORITY`,
  `registerComponentModel`, `registerComponentView`, `registerSeriesModel`, `registerChartView`,
  `registerCustomSeries`, `registerSubTypeDefaulter`, `registerPainter`.
- Note `PRIORITY` is exposed to installers, so ordering exists for processors and visuals, unlike LogicFlow.

### PrismJS

The purest hook-based design, and the least safe.

- Entire machinery is `hooks.add(name, callback)` and `hooks.run(name, env)`. **There is no `remove`/`off`.**
- Hook names are free-form strings with no registry and no typo detection. Callbacks run synchronously in
  registration order.
- The extension point is the **hook**, not the plugin object, so N plugins compose at one point and the host needs no
  knowledge of any of them. That is the flexibility argument in its strongest form.
- Full hook list with caller and `env` shape: `before-highlightall` (`{callback, container, selector}`),
  `before-all-elements-highlight` (adds `elements`), `before-sanity-check` (`{element, language, grammar, code}`),
  `complete` (early exit on empty code), `before-highlight`, `before-tokenize` (`{code, grammar, language}`),
  `after-tokenize` (adds `tokens`), `wrap` (`{type, content, tag, classes, attributes, language}`, once per token),
  `before-insert` (adds `highlightedCode`), `after-highlight`, `complete`.
- Verified order for one element: `before-sanity-check` → `before-highlight` → `before-tokenize` → `after-tokenize` →
  `wrap` (per token) → `before-insert` → `after-highlight` → `complete`. Note `complete` has two call sites and can
  fire without any highlighting.
- No teardown of any kind, and page-global state, so two configurations cannot coexist.

---

## 3. Hook-contract designs, no bus

### Chart.js

The richest hook set found, ~35, all `(chart, args, options)`, dispatched by `chart.notifyPlugins(hook, args)`.

- Install/uninstall pairs: `install`, `start`, `stop`, `uninstall`.
- Init and update: `beforeInit`, `afterInit`, `beforeUpdate`, `afterUpdate`, `beforeElementsUpdate`, `reset`,
  dataset(s) update and draw pairs, `beforeLayout`, `afterLayout`, `beforeRender`, `afterRender`, `beforeDraw`,
  `afterDraw`, `beforeEvent`, `afterEvent`, `resize`, `beforeDestroy`, `afterDestroy`, `beforeTooltipDraw`,
  `afterTooltipDraw`, plus four scale hooks.
- **Cancellation without a bus**: `before*` hooks return `false` to cancel when `args.cancelable`.
- Teardown order on `chart.destroy()`: `beforeDestroy` → `afterDestroy` → `stop` → `uninstall`. Note `stop` and
  `uninstall` fire **after** canvas and ctx are nulled. `stop` also fires when a plugin is disabled at runtime.
  `Chart.unregister()` is global teardown and never emits `uninstall`.
- Ordering is registration order then inline array order, **undocumented**, read off `allPlugins()` and `_notify`.

### CodeMirror 6

- `StateField`: `create`, `update`, `compare`, `provide`, `toJSON`/`fromJSON`. No destroy: values are immutable.
- `ViewPlugin` (`PluginValue`): `update(ViewUpdate)`, `docViewUpdate(view)`, `destroy()`, plus spec `eventHandlers`,
  `eventObservers`, `decorations`, `provide`.
- `EditorView.updateListener` is a facet, so listening is an extension like any other.
- **The only error isolation in the survey**: a crashing plugin is logged, `destroy()`ed and deactivated, explicitly
  so one extension cannot take down the view.
- Reconfiguration destroys removed view plugins automatically; compartment teardown is transitive.

### ProseMirror

- State side: `init`, `apply`, `toJSON`, `fromJSON`.
- View side: `view(view)` returning `{ update, destroy }`.
- `props`: about 30 `EditorProps`, with `this` bound to the plugin.
- **Two genuine interception points without a bus**: `filterTransaction` (veto) and `appendTransaction` (fixed-point
  loop, letting a plugin react to and extend a transaction).
- `someProp` resolution order: direct props → view plugins → state plugins, first truthy short-circuits. Exceptions:
  `decorations` aggregates rather than short-circuiting; `nodeViews` is first-wins per type.
- View plugins passed directly to the view must not have a state component (`RangeError`).
- Teardown: `view.destroy()` destroys plugin views in **reverse order**, idempotent. A plugin-set change destroys and
  recreates **every** plugin view, since comparison is array identity.

### Tiptap

Sits on ProseMirror and adds an editor-level event layer.

- **Eight event-backed hooks**, wired in `setupExtensions()`: `onBeforeCreate`, `onCreate`, `onUpdate`,
  `onSelectionUpdate`, `onTransaction`, `onFocus`, `onBlur`, `onDestroy`. Each is registered as `editor.on(<event>)`.
- **A ninth, non-event hook: `dispatchTransaction`, composed as middleware** via `reduceRight`, so extensions wrap
  each other rather than being notified. Worth studying: it is the only middleware-shaped hook in the survey.
- Contributor hooks (not lifecycle, same config surface): `addOptions`, `addStorage`, `addGlobalAttributes`,
  `addCommands`, `addKeyboardShortcuts`, `addInputRules`, `addPasteRules`, `addProseMirrorPlugins`, `addExtensions`,
  `extendNodeSchema`, `extendMarkSchema`.
- **Events with no extension hook**, reachable only via imperative `this.editor.on(...)`: `mount`, `unmount`,
  `contentError`, `beforeTransaction`, `paste`, `drop`, `delete`. A useful asymmetry to note: the hook set and the
  event set are not the same thing.
- Ordering: numeric `priority`, default 100, higher first. `ExtensionManager.plugins` then re-reverses and re-sorts
  for ProseMirror, with the stated rationale that Tiptap wants later array entries to be overridable.
- Extension listeners register before the option callbacks, so extension hooks fire before user `onCreate`/`onUpdate`.
- Teardown: `destroy()` is idempotent via a flag, emits `destroy` **before** teardown so editor, view, schema and
  storage are all still usable inside `onDestroy`, then `removeAllListeners()`, then `extensionManager.destroy()`.
  Deliberately never severs `.parent`, since extensions can be shared across live editors.

### maxGraph

One hook: `onDestroy()`, required by the interface, called from `AbstractGraph.destroy()`. No init, no update, no
render. Construction is the de-facto init. Nothing else exists.

### AntV X6

Three required, three optional: `name`, `init(graph, ...options)`, `dispose()`, then `enable?`, `disable?`,
`isEnabled?`. `init` is called synchronously inside `graph.use()`. `dispose` is called by `Graph.dispose()` and by
`disposePlugins()`. No update hook, no event-hook contract, `init`'s return value ignored.

### AntV G6

Three, after inheritance from `BaseExtension`: `constructor(context, options)`, `update(options)`, `destroy()`.
**There is no `init`.** Plugins bind their own listeners in the constructor and unbind in `update`/`destroy`; the
`events` array field on the base class is declared but never used by any plugin. `update` is called for every plugin
on each `setExtensions` pass, including unchanged ones.

### xterm.js

Two: `activate(terminal)` and `dispose()`, the latter from `IDisposable`. `activate` is called synchronously inside
`loadAddon`. The notable design point is that **every host extension API returns an `IDisposable`**
(`registerLinkProvider`, `registerMarker`, `registerDecoration`, `parser.register*Handler`, `unicode.register`,
`attachCustomKeyEventHandler`), which is why addon `dispose()` implementations are usually a one-line fan-out.
Teardown is reverse load order, and `loadAddon` monkey-patches `instance.dispose` so calling it also unregisters the
addon, making it idempotent.

### Shopify draggable

Two: `attach()` and `detach()`, both called by `addPlugin`/`removePlugin`, with `destroy()` removing every plugin.
Base implementations **throw `new Error('Not Implemented')`** rather than being no-ops, so a plugin needing only one
must still stub the other. Inter-plugin coordination is by event emitter on the host, not by references.

### GrapesJS

**No hook interface at all.** The entire lifecycle is: call the plugin function once, optionally call the cleanup
function it returned. Observability is via editor events instead: `plugin:add`, `plugin:remove`,
`plugin:remove:before`, `plugin:update`, `plugin`. Cleanup is tracked by listening to add-events during plugin
execution and replaying them reversed, limited to editor-level registrations, and it runs only on explicit
`Plugins.remove()`, never on editor destroy.

### Cytoscape, countUp.js, auto-animate

- **Cytoscape**: no lifecycle for core or collection extensions, the registrant *is* the method. Layouts have a real
  contract: `constructor(options)`, `run()`, `stop()`, framework-injected `stop` wrapper, defaulted `destroy()`, an
  emitter mixin, and events `layoutstart` / `layoutready` / `layoutstop` bubbling to `cy`.
- **countUp.js**: one method, `render(elem, formatted)`, called once per animation frame. No init, no teardown at all.
- **auto-animate**: none. The single plugin function is the entire surface, invoked at three call sites for the
  `add`, `remain` and `remove` actions.

---

## 4. Axes worth using for the comparison

Collected while reading, not yet applied systematically:

1. **Notification versus interception.** Only bpmn-js (priority + `stopPropagation` + return value), ProseMirror
   (`filterTransaction`, `appendTransaction`), Chart.js (`return false` on cancelable hooks) and Tiptap
   (`dispatchTransaction` middleware) let an extension change what happens. LogicFlow, PrismJS, ECharts and every
   fixed-hook design only let it observe.
2. **Fixed hook set versus open bus.** Fixed hooks are discoverable and typable but every new extension point is an
   interface change and a coordinated release. An open bus costs one `emit` per new point and nothing else, at the
   price of discoverability and typing. LogicFlow is the clearest case study on both sides.
3. **Who calls the hook.** Rarely the object you would expect: LogicFlow's `render` is called by a preact component,
   Chart.js's `stop`/`uninstall` fire after the canvas is nulled, this package's `onDispose` runs before
   `super.dispose()`.
4. **Ordering.** Array order (this package, X6, G6, ProseMirror, draggable), numeric priority (Tiptap, bpmn-js,
   ECharts processors), precedence buckets (CodeMirror), topological (bpmn-js modules), or undocumented (Chart.js, G6
   DOM insertion).
5. **Error isolation.** CodeMirror is the only library that contains a crashing extension. Everyone else lets it
   propagate, which for this package means a throwing `onDispose` prevents the graph from being destroyed.
6. **Teardown symmetry.** Whether every `register` returns a disposable (xterm.js, the cleanest), whether teardown is
   reverse order (ProseMirror, xterm.js), whether it is idempotent (Tiptap, xterm.js), and whether the registry is
   cleared (this package, X6 and ECharts do not).
7. **Typing of event names.** Augmentable interface (possible in principle), `type` alias (LogicFlow, closed
   forever), or untyped strings (PrismJS). This is the same declaration-merging question as the plugin registry, one
   level down.
