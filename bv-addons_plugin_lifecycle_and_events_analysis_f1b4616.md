# Plugin lifecycle hooks and event systems: what this package has, what the field does, what to build

Companion to [`bv-addons_plugin_system_analysis_94519a2.md`](./bv-addons_plugin_system_analysis_94519a2.md), which
studied how plugins are loaded and retrieved. This one studies what happens **after** they are loaded: how a plugin
learns that something happened, and how it is torn down.

Same corpus, same pinned versions, same rule that every claim is cited to `file:line` or marked unverified. Research
performed 20 August 2026. The versions and sources table of the companion document applies unchanged and is not
repeated here. Where a reading differs from that document, the difference is called out.

This package is read at `main`, commit `f1b4616`.

---

## Verdict

Two questions are usually merged and should not be. **Lifecycle hooks** answer "tell me when the host does something
it already knows about"; an **event bus** answers "let anyone tell anyone". This package has the first, five hooks,
and none of the second.

The recommendation is a single synchronous event bus on the `BpmnVisualization` instance, not per-object listeners,
with four properties the corpus shows are decided at design time and expensive to add later: error isolation from the
first line, no interception through return values, event names typed by an augmentable interface, and `on()` returning
a disposable. Five shapes were weighed, in section 4.2; the runner-up, typed event properties in the xterm.js style,
loses on one point only, and it is the one that matters here.

The hard constraint, and the reason to be modest about scope: **this package can only emit events about things it
mediates itself.** It mediates `load`, `dispose` and plugin registration. It does not mediate zoom, pan, click or
selection, which happen inside `bpmn-visualization` and are reachable only through an escape hatch marked
`@experimental`. An event bus here is worth building for the lifecycle, and cannot deliver the interaction events that
the core's own [issue #1488](https://github.com/process-analytics/bpmn-visualization-js/issues/1488) is about.

---

## 1. Where this package stands

Five hooks, all optional, declared at `plugins-support.ts:43` (`onConfigure`), `:61` (`onDispose`), `:73`
(`onBeforeLoad`), `:84` (`onLoadSuccess`), `:95` (`onLoadError`).

| Hook | Dispatched at | Args | Errors caught |
|---|---|---|---|
| constructor | `:159`, inside `registerPlugins`, itself called from the constructor at `:127` | `(bpmnVisualization, options)` | no |
| `onConfigure` | `:169`, second loop, after **all** plugins are constructed | full `GlobalOptions` | no |
| `onBeforeLoad` | `:136`, start of `load`, before `super.load` | none | no |
| `onLoadSuccess` | `:143`, after `super.load` returns | none | no |
| `onLoadError` | `:140`, in the `catch`, before the rethrow | the error | no |
| `onDispose` | `:131`, **before** `super.dispose()` at `:132` | none | no |

Dispatch is `forEachPlugin` (`:173-177`), a bare `for...of` over the map with no guard. Ordering is `Map` insertion
order, therefore `options.plugins` array order. It is neither documented nor asserted by any test.

There is no event bus, no way for a plugin to notify another, no interception, and no error isolation. The absence of
isolation is not theoretical: a throwing `onDispose` prevents `super.dispose()` entirely, so the graph is never
destroyed. That defect and its siblings are tracked in section 2.3 of the companion document.

### The core offers nothing to build on

`bpmn-visualization` 0.48.0 has **no event mechanism at all** on its public surface. No emitter, no subscription, no
callback in `GlobalOptions`, which holds exactly `container`, `navigation`, `parser` and `renderer`. The library never
fires an event of its own: `fireEvent` appears zero times in the published bundle. `load()`
(`dist/bpmn-visualization.esm.js:4946-4954`) is synchronous, returns `void` and emits nothing; the only observable
signal is the exception it throws. `dispose()` emits nothing either.

Two escape hatches leak mxGraph's event system: the `mxgraph` named export (`dist/bpmn-visualization.d.ts:901`) and
the `graph` property (`:252`). Both carry explicit warnings, "for advanced users", `@experimental`, "subject to
change, could be removed". They are a leak, not an API, and building on them would couple this package to mxGraph
4.2.2 internals.

This is exactly why the plugin hooks are imperative: `BpmnVisualization` overrides `load` and `dispose` and calls the
hooks itself, because nothing tells it otherwise.

### About issue #1488

[`[FEAT] Send events on Zoom`](https://github.com/process-analytics/bpmn-visualization-js/issues/1488), open since 19
August 2021, no comments in five years, no linked pull request, no assignee. Its scope is **zoom only**: move a slider
when the wheel is used, signal that a bound was reached, hide or show a minimap. Its body says "Event content to be
defined" and points at mxGraph's `FIRE_MOUSE_EVENT` without choosing an API shape.

It establishes that a need for events was identified upstream, which is a useful data point. It is not a design this
package can inherit, and it does not cover the lifecycle events that are actually within reach here.

---

## 2. The two reference designs

These two are the starting point of the study, and they frame the choice: one mechanism in one place, or many
mechanisms on many objects. Three further shapes are weighed in section 4.2.

### bpmn-js: one shared bus, injected

`EventBus` is an ordinary service in the same module declaration as `canvas` and `elementRegistry`
(`diagram-js/lib/core/index.js:18`), and didi caches instances by name (`didi/dist/index.js:163`, `:174`), so every
module resolving `'eventBus'` gets the same object. A module receives it by declaring it as a constructor parameter.
Nothing has to know who else is listening.

- `on(events, priority, callback, that)`, `once`, `off`, `fire`. Default priority is 1000 (`EventBus.js:11`), higher
  runs first (`:512`), equal priorities are first-registered-first-served (`:485`). `events` may be an array, and a
  non-number priority throws (`:187`).
- Dispatch is synchronous: a `while` walk over a priority-ordered linked list calling `fn.apply` directly
  (`:420-436`, `:613`). `fire` returns after the last listener.
- **Interception is first-class.** A non-`undefined` return value is stored as the result and calls
  `stopPropagation()` (`:460-468`), and `fire` returns it (`:394`).
- Some events are transform points rather than notifications:
  `xml = this._emit('import.parse.start', { xml: xml }) || xml;` (`bpmn-js/lib/BaseViewer.js:240`), with the source
  comment "hook in pre-parse listeners + allow xml manipulation". Same shape at `:269`, `:437`, `:444`.
- There is no `__destroy__` module hook. Cleanup is per-service, each subscribing to `diagram.destroy` in its own
  constructor: `EventBus.js:133` at priority 1, `Canvas.js:315` at priority 500, and the same in `CommandStack`,
  `Dragging`, `Keyboard`, `Scheduler`, `PopupMenu`, `SearchPad`.
- `diagram.init` is documented as "An event indicating that all plug-ins are loaded. Use this event to fire other
  events to interested plug-ins" (`Diagram.js:124-126`).

Two corrections to the received wisdom about this bus. **`preventDefault()` does not halt the chain**: it only sets
`defaultPrevented` (`:596-598`), and the loop breaks solely on `cancelBubble` (`:427`); its effect on the result is
conditional on no listener having returned anything (`:390`). And there **is** an error seam, contrary to what a quick
read suggests: `_invokeListener` wraps the call and routes failures through `handleError`, which fires an `error`
event and treats the error as handled only if a listener returns `false` (`:404-406`, `:455-475`). Neither package
ships a default `error` listener, so in practice a throw is logged and rethrown into the caller of `fire`, and the
remaining listeners are skipped.

### maxGraph: listeners on many objects

`EventSource` (`packages/core/src/view/event/EventSource.ts`) is a 153-line base class holding one flat array
(`:40`). `addListener(name, funct)` is a bare `push` (`:87-89`). `fireEvent` loops and invokes the listeners whose
name matches (`:121-140`). `removeListener` matches **on function identity only, ignoring the name** (`:94-104`),
which is why one call can unwind three registrations.

Nineteen classes extend `EventSource`. A plugin realistically attaches to the graph, the data model, the view, the
selection model, the undo manager, other plugins, and raw DOM nodes. Only three of the ten built-in plugins are
themselves event sources; the other seven cannot emit at all.

**The constraint you named is real, and the failure modes are two, not one.**

The benign one is silence. `addListener` validates nothing and `fireEvent` only invokes matching names, so a listener
on the wrong object is stored and never called. No error, no warning, no log. `EventSource.ts` contains no logging of
any kind.

The dangerous one is a false positive. `CHANGE` is a real event on **both** the data model, carrying `{edit, changes}`
(`GraphDataModel.ts:1083`), and the selection model, carrying `{added, removed}` (`SelectionChange.ts:66`). A listener
on the wrong one **does fire**, then reads an absent property as `undefined`. `UNDO` is worse, fired by four different
objects: `GraphDataModel.ts:1061`, `GraphView.ts:396`, `GraphSelectionModel.ts:232`, `UndoManager.ts:140`. And
`getProperty` returns `any` (`EventObject.ts:78-80`), so the compiler cannot help.

Nothing lets an author get it right in advance. The 96 event-name constants (`InternalEvent.ts:532-1007`) all carry a
tautological doc line of the form "Specifies the event name for change"; a filter for any other doc text returns zero
lines. There are no `@fires`, `@event` or `@emits` tags anywhere in `packages/core/src/`. There is no events page in
the documentation, and the plugin authoring guide mentions listeners once, in passing, without saying which object to
attach to. A `### Events` JSDoc section exists in four classes, none of which is the graph, the data model or the
view. Even grepping fails: the selection model's `CHANGE` is fired from `SelectionChange.ts`, and the view's `UP` and
`DOWN` from `CurrentRootChange.ts`, so searching the owning class finds nothing.

Two further properties. Dispatch is synchronous with **no isolation whatsoever**, not a single `try`/`catch`: a
throwing listener aborts the loop, skips every later listener, and propagates into the host, sometimes mid-transaction
(`GraphDataModel.ts:1082-1087`). And `EventObject.consume()` exists (`:92-94`) but **`fireEvent` never reads it**;
cancellation is purely cooperative, re-implemented by each firing site that chose to check, of which
`EventsMixin.ts:238-249` is the canonical example.

### What the pair teaches

Both are synchronous, both make the sender wait, and that is the corpus norm. Your reading is right on that point.

The difference that matters is not injected-versus-per-object in the abstract, it is **how many places an author must
know about**. bpmn-js has one. maxGraph has nineteen, with colliding names, undocumented ownership, and silence on
error. For a package with five plugins and a single host object, that is a settled question.

---

## 3. The axes, applied

### 3.1 Notification or interception

| Library | Can an extension change what happens? | Mechanism |
|---|---|---|
| bpmn-js | yes, fully | priority, `stopPropagation`, return value replaces the result |
| ProseMirror | yes | `filterTransaction` veto, `appendTransaction` fixed-point loop |
| Chart.js | yes, bounded | `return false` on the nine `cancelable` `before*` hooks |
| Tiptap | yes | `dispatchTransaction` composed as middleware, and `transformPastedHTML` likewise |
| xterm.js | yes, in the parser | handler chains walked LIFO, `true` breaks the chain |
| draggable | yes | cancelable event objects, `event.cancel()`, honored by the host |
| GrapesJS | partly | the `*:remove:before` plus `opts.abort` convention |
| Cytoscape | partly | `stopPropagation` honored, `return false` implies both, but no priority |
| maxGraph | cooperative only | `consume()` is never read by the dispatcher |
| X6 | no, despite appearances | `trigger` folds handler returns into an `AsyncBoolean` that **nothing ever consumes** |
| G6, LogicFlow, PrismJS, ECharts, countUp, auto-animate | no | notification only |

X6 is the cautionary case: the plumbing for `return false` exists and is dead. Any documentation claiming it cancels
would be wrong. If a mechanism is not consumed, it is not a feature.

### 3.2 Synchronous dispatch, and what that costs later

Every library in the corpus dispatches synchronously. Nothing awaits a listener.

This matters for your "at worst a `sendAsync` later". **bpmn-js shows why that door closes if the return value carries
meaning.** An `async` listener returns a Promise, which is a non-`undefined` value, so it stops propagation and
becomes the result of `fire`, un-awaited. The design does not merely lack async support, it silently corrupts on
async use.

The lesson is precise: if asynchronous emission might ever be wanted, **do not give return values meaning**. Put
interception on the event object, ignore what listeners return, and an `emitAsync` can be added later without
redefining the synchronous contract.

### 3.3 Error isolation

Two libraries isolate, and the notes that preceded this document were wrong to say only one does.

- **CodeMirror** catches around plugin creation and update, routes to `logException`, calls `destroy()` and
  deactivates the plugin (`@codemirror/view` `src/extension.ts:233-267`). Not universal: `updateListener` callbacks
  invoked from the measure path are bare (`src/editorview.ts:511`).
- **Shopify draggable** is the simplest working pattern in the corpus, and the closest to what this package needs.
  `Emitter.trigger` wraps each callback, collects the errors, **runs every remaining listener anyway**, and logs once
  at the end (`Emitter.ts:68-82`). Ten lines. Its own `attach`/`detach` hooks are not covered, which is the gap to
  avoid reproducing.

Everyone else propagates, and the downstream damage is instructive:

- **Chart.js**: a throwing `beforeDestroy` skips all teardown and the `stop`/`uninstall` pair, and the chart leaks.
- **ProseMirror**: zero `try`/`catch` in either package; a throwing plugin-view `destroy` leaves the view half torn
  down with `docView` still set, so the idempotence guard does not even block a retry.
- **Tiptap**: see 3.5, the worst outcome in the corpus.
- **Cytoscape**: a throw skips the bubbling step and leaks the emitter's `emitting` counter, which never returns to
  zero, permanently changing `off()` behavior.
- **countUp**: `printValue` calls the plugin before the `requestAnimationFrame` reschedule, so one throw kills the
  animation loop for good rather than dropping a frame.
- **ECharts**: a throwing `afterinit` hook propagates out of `echarts.init()` *after* the instance was registered, so
  the chart exists and the caller never receives it. Since hooks are global and unremovable, one bad installer breaks
  every chart on the page permanently.

### 3.4 Ordering

Array or registration order for this package, X6, G6, ProseMirror, LogicFlow, PrismJS and Cytoscape. Numeric priority
for bpmn-js (default 1000, higher first), Tiptap (default 100, higher first) and ECharts, but ECharts' `PRIORITY`
applies to processors, layouts and visuals only, never to its lifecycle hooks. Precedence buckets for CodeMirror.
Undocumented for Chart.js, where it is registration order then inline array order and the plugin guide never mentions
it. Draggable is the outlier: **reverse registration order** (`Emitter.ts:65`), so last registered runs first.

X6 tears plugins down in insertion order (`graph.ts:1417-1419`), xterm.js in reverse (`AddonManager.ts:17-21`).
Neither documents the choice.

### 3.5 Teardown symmetry and the idempotence trap

The best-designed teardown in the corpus is xterm.js. Registration APIs hand back a disposable, so an addon's
`dispose()` is a one-line fan-out, and the addon manager overwrites the addon's own `dispose` with a wrapper that also
unregisters it (`AddonManager.ts:30`), making unloading idempotent from either side. One correction to the earlier
notes: it is not true that *every* extension API returns an `IDisposable`. `unicode.register` returns `void`
(`xterm.d.ts:1849`), and `attachCustomKeyEventHandler` and `attachCustomWheelEventHandler` are single-slot setters
with no handle (`:1040`, `:1062`).

**The trap to avoid is Tiptap's.** `destroy()` is made idempotent by a flag, and the flag is set **before** the
`destroy` event is emitted (`Editor.ts:824-830`). If an extension's `onDestroy` throws, `destroyed` is already `true`,
so a second call returns immediately and the view is never torn down: the editor becomes permanently
un-destroyable. Chart.js has the non-idempotent variant of the same failure.

This is directly relevant here. Making `dispose()` idempotent and isolating hook errors are **not two independent
fixes**. The order between setting the flag and running the hooks decides what happens when a hook throws, and the two
libraries that treated them separately both got caught.

GrapesJS deserves a mention for the opposite reason: its plugin teardown is automatic. A tracker records every
registration a plugin makes while it runs and replays the undos in reverse (`plugin_manager/index.ts:82-140`). If the
plugin function throws, the rollback runs and the error is rethrown (`:152-158`). The published type is also wrong
about the cleanup contract: the returned function is a *handler* that receives the built-in cleanup and may suppress
or wrap it (`:181-189`), not the cleanup itself.

### 3.6 Typing event names

The technique that works is an **augmentable interface keyed by event name**, and two libraries ship it.

- **X6**: `EventArgs` is an interface (`src/graph/events.ts:15`), and X6's own plugins augment it from outside with
  `declare module '../../graph/events'`, for instance `clipboard:changed` (`src/plugin/clipboard/api.ts:25-29`), and
  likewise for selection and history. A third party must target the deep module path rather than the package root.
- **GrapesJS**: `EditorEventCallbacks` is mergeable, and the bundled `dist/index.d.ts` exports it at top level so
  `declare module 'grapesjs'` works. Caveat: it carries a `[key: string]: any[]` index signature, so merging buys
  precise payloads, not permission.

Everyone else forecloses it, in three different ways. **LogicFlow** is the dead end: `EventArgs` is a `type` alias
intersection (`event/eventArgs.ts:635-643`) and none of its nine constituent interfaces is exported, so there is no
back door. **maxGraph** uses declaration merging heavily, 21 `.type.ts` files, but only for methods and properties;
there is no name-keyed interface to merge into, and event names are bare strings. **bpmn-js** is generic over an event
map but pairs every typed overload with a `string` fallback (`EventBus.d.ts:153`, `:173`), leaves `fire` entirely
untyped (`:285`), and ships no `declare module` seam, so a third-party module cannot register a name and the consumer
must compose the type by hand at construction. **Tiptap** ships purpose-built merge targets for `Commands` and
`Storage` but not for events, and adding an `onFoo` to its config interface is inert because the eight hook names are
hardcoded in `setupExtensions`.

### 3.7 Who calls the hook

Rarely the object one would expect, and this is where surprises hide.

LogicFlow's `render` is called by a preact component from `componentDidMount`/`componentDidUpdate`
(`view/overlay/ToolOverlay.tsx:15-21`, `:47`), not by LogicFlow, and the queue is cleared right after (`:48`), so it
runs exactly once per instance and a plugin that subscribes there is inert until the consumer calls `lf.render()`.
Chart.js fires `stop` and `uninstall` **after** canvas and ctx are nulled (`core.controller.js:937-955`). G6 has no
`init` at all; its `update` is called for every already-existing plugin on each pass, including unchanged ones
(`registry/extension/index.ts:31-38`). This package's `onDispose` runs before `super.dispose()`, which is the right
choice, since the model is still reachable.

---

## 4. What to build here

### 4.1 A bus, or the hooks we already have

The five hooks are not a stopgap, and the comparison has to start by saying what they get right, because three of the
failure modes catalogued above cannot occur here at all.

**What the current design buys.** The host calls the plugin directly, so there is no subscription bookkeeping and
therefore **no listener can leak**: maxGraph's `TooltipHandler`, which unsubscribes two of its three registrations
and misses the third, and bpmn-js's injector, which never clears its instance cache, are both failures of a mechanism
this package does not have. The contract is one interface with TSDoc on every member, so the extension
surface is exactly as large as it looks. Ordering is the `options.plugins` array, with no priority puzzle and no
`isFunction` disambiguation. There is no event-name namespace, so no collisions and no typo-shaped runtime silence
beyond the one noted below. Nothing is global and nothing needs tree-shaking.

**What it structurally cannot do**, in decreasing order of how much it matters here.

1. *Plugin to plugin.* The only route today is `getPlugin` plus a direct call, which is a compile-time dependency on
   the other plugin's type and, since #554, an `undefined` to handle at every call site. Two plugins that want to
   cooperate must know each other. A bus is the standard answer, and it is what draggable uses: `SwapAnimation`
   listens for `sortable:sorted` without knowing which plugin emits it.
2. *A plugin cannot expose an event of its own.* Nothing can observe `StyleByNamePlugin` rebuilding a cache or
   `OverlaysPlugin` toggling visibility, short of wrapping the method. This is the gap that grows as plugins get
   richer, and it is not fixed by adding more hooks to the interface, because these events belong to the plugin, not
   to the host.
3. *Every new extension point is an interface change.* Adding a hook means editing `Plugin`, releasing the package,
   and doing it again for the next one. Only this package can add one; a plugin author never can. Contrast PrismJS,
   where a new extension point costs exactly one `hooks.run` call, at the price of everything else it gives up.
4. *A misspelled optional hook is silent, and the mandated form is the unsafe one.* `implements` does not perform
   excess property checking, so a class declaring `onLoadSucces` compiles clean and is simply never called. The same
   typo in an object literal is caught, `TS2561 ... Did you mean to write 'onLoadSuccess'?`. Measured with TypeScript
   5.9.2, `strict`, the two forms side by side. Since `PluginConstructor` requires a class, consumers of this package
   only ever write the form the compiler does not check.

**What a bus would cost**, stated as plainly. A second mechanism to learn, document and test, alongside the hooks that
stay. A name namespace with no compile-time uniqueness, one level below the plugin-id namespace that already has the
same problem. Listener leaks become possible for the first time, which is why `on()` must return a disposable rather
than merely being available. Error isolation stops being optional, because a bus multiplies the number of places a
third party's code runs inside ours. And ordering becomes a question that the hooks answered for free.

**The honest weighing.** One argument that would normally carry a bus does not apply here: an application does not
need `load:success` to know a load succeeded, because `load()` is synchronous and the next statement runs after it.
The value is therefore concentrated in points 1 and 2, both of which are about plugins talking to each other and to
the application, not about the host's own lifecycle. That is a real need, and a smaller one than "this package needs
an event system".

Two cheaper options deserve to be rejected explicitly rather than skipped. **Adding more hooks** is genuinely cheap
while the set is small, which is why maxGraph ships one and X6 and G6 ship three, but it does nothing for points 1 and
2, and it makes this package the bottleneck for every new extension point. **Leaving plugin-to-plugin to `getPlugin`**
works today and costs nothing to keep, but it produces exactly the coupling the plugin system exists to avoid, and it
degrades badly once a plugin can be absent.

The recommendation that follows is therefore narrower than "add an event bus": keep the five hooks as the host's
lifecycle contract, and add a bus whose first purpose is plugin-authored and plugin-to-plugin events, with the host
lifecycle mirrored onto it because that costs one line per hook. Keeping both is not a compromise, it is what Tiptap
does, and for the same reason: a hook is the right shape when the host knows who should react, a bus when it does not.

### 4.2 Three other shapes, one of which is a real rival

A shared injected bus and per-object listeners are the two designs this study started from. They are not the only
options, and one of the three below deserves to be weighed against the bus rather than mentioned in passing.

**A. Typed event properties returning a disposable.** xterm.js's shape: no bus and no string names at all, one
property per event, each backed by its own emitter, subscribed by calling it and unsubscribed through the handle it
returns.

```ts
const subscription = bpmnVisualization.onLoadSuccess(() => { /* ... */ });
subscription.dispose();
```

Its public set is fixed and small, `onBell`, `onData`, `onKey`, `onRender`, `onResize` and a dozen more
(`xterm.d.ts:885-971`), each an `IEvent<T>` whose subscribe call returns an `IDisposable`
(`src/common/EventEmitter.ts:12-13`, `:29-43`).

This obtains **by construction** three of the four properties section 4.4 says are expensive to retrofit. Typing is
exact without an augmentable interface, and a misspelled `onLoadSucces` is a compile error rather than a listener that
never fires, which is precisely the hole measured in section 4.1. Unsubscription is in the signature, so it cannot be
forgotten. And there is no name-keyed dispatch, so there is no return value to give meaning to, which keeps an
asynchronous variant possible.

The usual objection, that the set is frozen by the host, costs little here: the mediated surface is five events and
will not grow until the core emits something. The real objection is the one that matters. A plugin exposing
`onCacheRebuilt` on itself is reachable only through `getPlugin`, so **plugin-to-plugin coupling returns exactly where
the bus removed it**, and that was the strongest argument for the bus in the first place. Safety against decoupling,
in one sentence.

**B. DOM `CustomEvent` on the container.** The platform already ships an event system, and this package already owns a
container element:

```ts
container.dispatchEvent(new CustomEvent('bv:load-success', { detail: { /* ... */ } }));
container.addEventListener('bv:load-success', listener);
```

Nothing to design, nothing to maintain. Subscription and teardown are standard, `stopPropagation` and
`preventDefault` come for free and are understood by everyone, non-TypeScript consumers and framework components can
listen without importing anything, and browser devtools can inspect listeners. A plugin can emit its own events
without asking the host for permission, which answers the same need as the bus.

The costs are real. String names return, typable only by augmenting the global `HTMLElementEventMap`, which is a
coarser seam than a package-scoped interface. Events bubble up the DOM by default and can reach the host application
unbidden, so `bubbles: false` should be the default and the choice documented. And the container, currently an
implementation detail the consumer merely supplies, becomes a public API surface.

None of the seventeen libraries uses this as its extension channel. Two of them contain `CustomEvent` for unrelated
reasons: X6's `onCustomEvent` is its own naming for magnet events on cell views, and GrapesJS re-dispatches canvas
iframe events onto the main document for interop (`packages/core/src/utils/dom.ts:101`). Checked against the cached
sources of the libraries read for this study, not exhaustively across all seventeen.

**C. A middleware chain.** Tiptap's `dispatchTransaction` is composed with `reduceRight` so that each extension
receives a `next` continuation and wraps the others (`ExtensionManager.ts:332-359`), and `transformPastedHTML` is
chained the same way (`:366-400`). ProseMirror's `appendTransaction` is the same idea run to a fixed point
(`state.ts:144-167`).

It is the only shape in the corpus that lets an extension **change** what happens rather than observe it, and it is
listed here to be rejected explicitly rather than silently. Section 4.4 argues against interception, no use case
attests the need, and a pipeline costs considerably more than a bus in ordering rules, debuggability and
documentation. Naming it at least records what is being given up: with any of the other shapes, no plugin will ever be
able to veto a load, rewrite the BPMN source before parsing the way bpmn-js allows at `import.parse.start`, or filter
what another plugin does.

**Where this leaves the recommendation.** B and C are recorded, not chosen: B trades a designed API for a platform
one and loses the typing this package cares about, C solves a problem nobody has. A is a genuine rival and the
decision between it and the bus is a single trade-off, safety by construction against plugin-to-plugin decoupling.
The bus is recommended because points 1 and 2 of section 4.1 are the whole reason to build anything here, and A
addresses neither. A hybrid is available if that judgement turns out wrong: the host lifecycle as typed properties,
the plugin-authored events on a bus. It is more surface than either, and it is the fallback rather than the proposal.

### 4.3 What can actually be emitted

The reachable surface is bounded by what this package mediates. It overrides `load` and `dispose`, and it owns plugin
registration. It does not see zoom, pan, click, hover or selection, because those happen inside the core, which emits
nothing and exposes its own graph only through an `@experimental` property.

So the honest first event set mirrors the existing hooks, plus registration:

`load:before`, `load:success`, `load:error`, `dispose:before`, `plugin:registered`.

That is not a disappointment, it is the same scope the hooks already cover, made available to anyone rather than only
to the plugin that implements the hook. Interaction events remain blocked upstream, and #1488 is the place where that
would be unblocked.

### 4.4 The design, and the evidence for each choice

**One bus on the `BpmnVisualization` instance.** Not per-object listeners. maxGraph's nineteen sources with colliding
names, undocumented ownership and silent misattachment is the counter-example; bpmn-js's single injected service is
the model. Per-instance, never module-global: ECharts' global `Eventful` fires every installer's hook for every chart
on the page and survives `dispose()`, with no way to unregister.

**Synchronous, and say so.** The corpus is unanimous and it is what the hooks already do.

**No interception through return values.** Ignore what a listener returns. If cancellation is ever needed, put it on
the event object as an explicit method, the way draggable does with `cancel()`. This is the single decision that keeps
an `emitAsync` possible later, per 3.2, and it also avoids X6's dead-plumbing outcome where a return value is folded
into a result nobody reads.

**Error isolation from the first line.** Copy draggable's `Emitter.trigger`: wrap each listener, collect, run them
all, log once at the end. Apply it to `forEachPlugin` too, not only to the bus, which is precisely the gap draggable
left open on its own `attach`/`detach`.

**Set the disposed flag after the hooks, or use `try`/`finally`.** Tiptap's trap, section 3.5. This is a constraint on
the fix for `dispose()` idempotency, not a separate task.

**`on()` returns a disposable.** xterm.js's pattern, adapted: it makes a plugin's `onDispose` a fan-out over the
handles it collected, rather than a hand-maintained mirror of its constructor. maxGraph's `TooltipHandler` is what the
hand-maintained mirror looks like when it drifts, and the detail matters because the handler is mostly diligent.
Its `onDestroy` (`TooltipHandler.ts:314-336`) does unsubscribe: `this.graph.removeMouseListener(this)` at `:317`
removes it from the graph's mouse-listener list, and `InternalEvent.release(this.div)` at `:319` removes the gesture
listeners it put on its own tooltip element. What it misses is the third registration, a `'mouseleave'` DOM listener
placed on the **graph container** by the lazily-called `init()` (`:69-77`). `release` walks only the node it is given
and that node's descendants (`InternalEvent.ts:301-317`), and `this.div` was appended to `document.body` (`:58`), not
to the container, so it cannot reach it. Two mechanisms cleaned up, one forgotten, and nothing in the framework
notices: the container keeps a closure pinning the handler and the graph after `destroy()`, whenever a tooltip was
shown at least once.

**Type event names with an augmentable interface**, following X6 and GrapesJS. The shape is the one already
recommended for plugin ids in the companion document, one level down:

```ts
export interface BpmnVisualizationEventMap {
  'load:before': [];
  'load:success': [];
  'load:error': [error: unknown];
  'dispose:before': [];
  'plugin:registered': [pluginId: string];
}

export type EventName = keyof BpmnVisualizationEventMap | (string & Record<never, never>);
```

A plugin contributes its own names with `declare module '@process-analytics/bpmn-visualization-addons'`. Avoid the two
caveats the precedents carry: do not add a `[key: string]: any` index signature, which is what makes GrapesJS's merge
optional, and expose the interface from the package root rather than a deep path, which is X6's ergonomic problem.
Whether to keep the `(string & Record<never, never>)` escape is the same trade-off as `PluginIds`, and the answer
should match it.

**No priority, for now.** Nine of the seventeen use plain registration order. Priority is the kind of thing bpmn-js
needs because dozens of modules compose behaviors; five plugins do not. Document that order is `options.plugins`
order, and add a test asserting it, which no library in the corpus does. If priority is ever added, take it as a named
option rather than bpmn-js's positional argument disambiguated at runtime by `isFunction`.

### 4.5 What this does not solve

An event bus does not give plugins a dependency mechanism, does not make ordering safe, and does not replace the
typed retrieval discussed in the companion document. It also does not remove the need for the five hooks: a hook is
the right shape when the host knows exactly who should react and when, and a bus is the right shape when it does not.
Keeping both, as Tiptap does, is normal.

---

## 5. Corrections to the earlier working notes

The notes carried an explicit warning that hook lists and event names were unverified. Six were wrong.

1. "CodeMirror is the only library that contains a crashing extension." Draggable isolates too, and more simply.
2. "bpmn-js interception is `stopPropagation`, `preventDefault` and the return value." `preventDefault` does not halt
   the chain.
3. "bpmn-js has no error handling." It has an `error` event with an inverted contract, unhandled by default.
4. "ECharts fires `coordsys:aftercreate`." **That event does not exist.** The string appears zero times in the 5.5.1
   bundle and is absent from 6.0.0. There are six lifecycle events, not seven. The name appears to have been invented.
5. "ECharts lifecycle hooks receive the instance." Only `afterinit` does; `afterupdate` and the `series:*` events
   receive `(ecModel, api, ...)`, so a hook cannot identify the chart it is running for.
6. "xterm.js: every host extension API returns an `IDisposable`." Two of the six do not.

Three refinements rather than corrections: G6's `update` pass covers every *already-existing* plugin, not literally
every one; LogicFlow also accepts an object-literal plugin whose hook is `install(lf, LogicFlow)`, called
synchronously, unlike `render`; and countUp's `render` has four call sites, not one, so it runs before any animation
starts and after a reset.

---

## 6. Not verified

- No runtime experiments were run for this pass. Every claim comes from reading source, which for dispatch loops and
  `try`/`catch` presence is unambiguous, but no library was instrumented to observe ordering or isolation live.
- maxGraph's listener isolation, ordering and wrong-object attachment are untested upstream: the sole `EventSource`
  test covers `destroy()` only, so the behavior described in section 2 is read off `fireEvent`, not asserted by anyone.
- Whether maxGraph's rendered TypeDoc site adds anything beyond the 96 tautological constant docs was not checked.
- countUp.js has no `v2.10.1` git tag, so it was read from the published `dist/`, and line numbers refer to the
  bundle rather than to TypeScript source.
- CodeMirror 6.7.1 and 6.43.8 are not on GitHub, whose mirror stops earlier; they were read from the upstream
  `code.haverbeke.berlin` repository at those tags.
- How three of the four use cases motivating issue #1488 were closed, implemented or abandoned, was not checked, so
  nothing should be concluded about whether its motivation still stands.
