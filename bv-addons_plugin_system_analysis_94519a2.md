# Plugin system analysis: `@process-analytics/bpmn-visualization-addons`

Commit `94519a2`, package version 0.10.0, peer
[`bpmn-visualization`](https://github.com/process-analytics/bpmn-visualization-js) `>=0.48.0`.
Every claim is cited to `file:line` in this repo, or to a primary source for a third-party library. Seventeen
browser-side extension mechanisms were examined; the per-library detail is in the appendix.

Analysis carried out from 12 to 14 August 2026, with Claude Opus 5 (1M token context), using parallel research agents
for the third-party survey and compiled probes for the TypeScript claims.

Those probes are kept in [`tools/plugin-registry-probes/`](./tools/plugin-registry-probes/) and are runnable:
`./tools/plugin-registry-probes/run-probes.sh`. Every TypeScript claim in sections 5.A and 5.F comes from their
output. Their compiler errors are the measurement rather than a defect, so do not "fix" them.

## Verdict

The mechanism is small, correct in its core choices, and has the strictest collision handling of any comparable
library surveyed. Its weaknesses are concentrated at one point: **where a consumer gets hold of a feature**.
`getPlugin<T>(id)` is an unchecked cast returning a value typed as non-nullable that is actually `undefined` when the
id is unknown, and every feature call names the plugin class three times first.

The asymmetry that motivated this review is real, but it is a symptom. The disease is that a plugin cannot be
constructed by the consumer, because it needs the `BpmnVisualization` reference that does not exist yet, so the API is
forced to take a constructor and hand back an identity later.

## The organizing question

Seventeen libraries sort cleanly by one question: **does a plugin expose an imperative API that the consumer calls?**

- **No.** Draggable, GrapesJS, PrismJS, ECharts, Cytoscape and auto-animate have no retrieval API at all. The id
  problem, the cast problem and the collision problem simply do not exist for them. Shopify draggable is the proof
  that an id is a *consequence of retrieval*, not a prerequisite of plugins: a repo-wide search across its 76 source
  files for `getPlugin`, `pluginId` and `registerPlugin` returns zero hits, because the class object already serves as
  the identity for `addPlugin`/`removePlugin`.
- **Yes, and it costs them.** maxGraph, X6, G6, LogicFlow, bpmn-js and Chart.js all retrieve by an author-written
  string, and all pay with an unchecked cast. This package is in this group.
- **Yes, and solved.** ProseMirror (typed token), Tiptap (declaration merging), xterm.js and countUp.js
  (instance-passing), CodeMirror (extension values plus typed handles). Four distinct escapes, all in production.

This package needs the imperative API, so dropping the id is not available. The whole question is which escape to take.

## 1. Strengths

- **No global mutable state.** The plugin map is a per-instance field (`plugins-support.ts:123`), and a grep for
  module-level mutable bindings, `static` fields and shared registries across `packages/addons/src` finds none. This
  is rarer than expected: X6 patches `Graph.prototype` and keeps a module-global CSS loader, Cytoscape mutates
  prototypes globally and retroactively, ECharts and G6 hold permanent module-level registries with no `unuse`, and
  PrismJS is a single page-wide singleton where two configurations cannot coexist. This is the best property the
  package has, and several alternatives below would cost it.
- **Fail-fast on duplicate ids** (`plugins-support.ts:155-157`), tested for three cases including subclassing
  (`test/spec/plugins-support.test.ts:75-106`). Of seventeen libraries only ProseMirror also throws. maxGraph
  overwrites silently, G6 warns and overwrites, LogicFlow overwrites silently (and in the global-plus-instance case
  installs the plugin twice, contradicting its own docs), Tiptap warns and keeps both, Cytoscape is inconsistent by
  extension type.
- **The richest lifecycle of the class-based designs.** Five hooks (`plugins-support.ts:43-95`) against maxGraph's
  single `onDestroy`, X6's three, G6's three and LogicFlow's three. The two-phase construct-then-configure split
  (`plugins-support.ts:152-164`) means every plugin exists before any is configured, so a plugin can look up another
  in `onConfigure` without depending on array order. maxGraph has no equivalent and defers cross-plugin lookups to
  call time; LogicFlow's `render` hook does not fire until the consumer calls `lf.render()`.
- **Tree-shaking is not sabotaged.** No import side effects, no global registration call. Contrast X6 v3, where every
  plugin does `import './api'` executing `Graph.prototype.select = ...` at import time with no `sideEffects` field;
  G6, where `preset.ts` statically registers all eighteen built-ins on any import; and PrismJS, where plugins are
  side-effectful IIFEs mutating a global.
- **Hooks are documented for authors** (`packages/addons/README.md:77-82`, `docs/adr/0001-plugin-support.md:43-58`).
  X6 never documented its plugin interface in any version: an exhaustive grep of all 116 v3 and 178 v2 doc pages
  returns zero matches for `getPlugin` or any authoring term.

## 2. Weaknesses

### 2.1 The retrieval boundary

```ts
getPlugin<T extends Plugin>(id: PluginIds): T {
  return this.plugins.get(id) as T;
}
```
`plugins-support.ts:146-148`. Three defects in two lines:

1. **The generic is an unchecked cast.** `getPlugin<StylePlugin>('overlays')` compiles and returns an
   `OverlaysPlugin` typed as `StylePlugin`. Failure is a `TypeError` at the first method call. `getPlugin` carries no
   TSDoc at all.
2. **The return type lies.** Declared non-nullable `T`, actually `undefined` for an unknown id, asserted by the suite
   itself (`test/spec/plugins-support.test.ts:13`).
3. **The id has no link to the implementation.** `DefaultPlugins` (`plugins-support.ts:115`) re-declares the five id
   literals that already live in each `getPluginId()` body. Nothing keeps them in sync, and `T` can never be inferred.

Ceremony: `packages/demo/src/overlays.ts` names the class in the import (`:20`), in `plugins:` (`:30`) and as the type
argument (`:38`), plus once as a string, before one feature call at `:41`. In `path-resolver.ts` the first feature
call is 24 lines after construction.

### 2.2 The naming leak

"Plugin" appears 50 times in the demo sources and pages, 53 in the addons README, and reaches end-user-visible UI text
(`packages/demo/index.html:30`, `pages/overlays.html:13`).

The repo already contains the counter-example. `packages/demo/src/plugins-by-name.ts:42` is the only site naming the
result after the capability, `const styleRegistryByName = ...`, and the rest of that file reads
`styleRegistryByName.updateStyle(...)` with no plugin vocabulary.

Two questions are conflated here. "Plugin" is accurate vocabulary for the **author**, who implements a contract by
that name. It is noise for the **consumer**, who wanted overlays. Every library that made this transparent did so by
having the extension install API onto the host, never by renaming things.

### 2.3 Correctness defects

- **`dispose()` is not idempotent for plugins.** `plugins-support.ts:130-133` always runs the `onDispose` loop, while
  the core's `if (this.disposed) return;` guard sits behind `super.dispose()` and `disposed` is private.
- **No hook is wrapped in `try`/`catch`** (`plugins-support.ts:167-171`). A throwing `onDispose` aborts the loop and
  prevents `super.dispose()`, so the graph is never destroyed. CodeMirror by contrast catches a crashing plugin,
  destroys it and deactivates it, explicitly so one extension cannot take down the view.
- **The plugin map is never cleared on dispose**, so `getPlugin` keeps returning live instances afterwards. X6 has the
  identical bug.
- **The duplicate-id throw leaks a graph**: the check at `plugins-support.ts:155` runs after `super(options)` built the
  mxGraph, with no cleanup path.
- **`StyleByNamePlugin` does a full lookup on every call.** The mapping is "not cached, nor pre-fetched"
  (`plugins/style.ts:83-85`, tracked as issue #4), and `bpmn-elements.ts:63` says "Not optimized, do a full lookup at
  each call". This is a known and documented limitation rather than a finding, listed here because the fix interacts
  with the next item and with eager instantiation: a cache would most naturally be built when the diagram loads, which
  is what `onLoadSuccess` exists for.
- **`StyleByNamePlugin` substring bug.** `plugins/style.ts:103` and `:115` cast `string | string[]` to `string[]`, and
  `bpmn-elements.ts:93` filters with `names.includes(element.name)`. With a single string that is
  `String.prototype.includes`, so `updateStyle('Task 1', ...)` also matches an element named `Task`. Passing a plain
  string is part of the documented signature. No test covers it.
- **The typings-validation package never exercises the plugin API.** `packages/check-ts-support/src/index.ts:18`
  imports `BpmnVisualization` from `bpmn-visualization` rather than from the addons package, and contains zero uses of
  `plugins:` or `getPlugin`. So `PluginConstructor`, `getPlugin` and the `GlobalOptions` module augmentation, the
  riskiest typing construct in the package, are never checked against the minimum supported TypeScript version. It
  also reproduces the exact mistake the README and the ADR warn consumers against.

## 3. Missing features

### For the plugin author

| Gap | Current state | Who solves it |
|---|---|---|
| Declared dependencies | None | CodeMirror (`enables`/`provide` pull the dependency in), bpmn-js (`__depends__`, identity-deduplicated, topologically sorted). maxGraph, X6, G6, LogicFlow, Tiptap and draggable all have nothing |
| Load ordering | Array order, undocumented and unasserted | CodeMirror `Prec` buckets, Tiptap numeric `priority`, bpmn-js topological sort |
| Error isolation | None, see 2.3 | CodeMirror |
| Per-plugin typed options | Whole `GlobalOptions` passed to every plugin twice; namespacing is an unenforced README convention | Chart.js (namespaced, declaration-merged), GrapesJS (inferred from the plugin value, see below), xterm.js, countUp.js and X6 (ordinary constructor arguments) |
| Options validation | None. The only thrown error in the system is the duplicate-id one | Chart.js, and any instance-passing design where the plugin's own constructor validates |
| Adding API surface | Methods live on the plugin object; the consumer must fetch it | Tiptap (declaration merging), X6 and Cytoscape (prototype patching) |
| Cross-plugin communication | Only `getPlugin` from inside a plugin, unused by any shipped plugin | bpmn-js event bus with priority and interception, LogicFlow event bus without either |
| Plugin metadata | Nothing beyond the id. A descriptor carrying version, declared dependencies and a capability list would give a single home for three separate gaps above | no browser library in the survey ships one; it is closer to what server-side plugin systems do |

GrapesJS solves options typing in a third way worth recording, since it needs no registry and no merging:

```ts
export const usePlugin = <P extends Plugin<any> | string>(
  plugin: P, opts?: P extends Plugin<infer C> ? C : {}) => {
```

The option type is inferred from the plugin value at the registration site.

### For the consumer

| Gap | Current state | Who solves it |
|---|---|---|
| Knowing whether a plugin is loaded | Nothing. No `hasPlugin`, no `getPlugins`, no warning. The only signal is a `TypeError` | Chart.js throws on miss; G6 warns on a miss and on an unregistered plugin |
| Knowing what a plugin adds | Read the source. The README says so outright (`README.md:54`) | ProseMirror and CodeMirror export plain functions, so the module's exports are the API |
| Add or remove after construction | Impossible | Eight of the seventeen, detailed below: X6, G6, Chart.js, CodeMirror, ProseMirror, xterm.js, GrapesJS, draggable. Tiptap does it for ProseMirror plugins but not for its own extensions |
| Enable or disable without unloading | Impossible | Chart.js `options.plugins.<id> = false`, the only clean case. X6 `enablePlugins` works only for plugins that opted in, and silently does nothing otherwise. LogicFlow `disabledPlugins` does **not** belong here: it is read once in the constructor and skips installation |
| Declaring a plugin set once for the whole app | Impossible; every call site repeats the list | LogicFlow: `LogicFlow.use(X)` registers the class globally, each instance constructs its own copy, and `plugins` plus `disabledPlugins` override per instance. This layering is genuinely more capable than a constructor-only list, and is orthogonal to every other axis here |
| Version compatibility | Nothing links a plugin to a core version | X6 v2 used per-plugin peer dependencies |
| Deferred construction | Every plugin is constructed at startup, used or not (`plugins-support.ts:152-159`). Harmless while the shipped plugins are thin wrappers over `bpmnElementsRegistry`, and not harmless once one builds an index at construction, which is exactly what a cached `StyleByNamePlugin` would do | nothing in the survey defers construction either; G6 and X6 also build eagerly. Worth noting as a deliberate simplicity choice rather than an oversight |

### Dynamic plugin management

The DeepWiki pass made "dynamic plugin management" one of its three recommendations. It deserves more than the two
rows above, because the survey shows the capability is common, and because adding it here would rewrite three
published contracts rather than add one method.

**What the survey found.** Eight of the seventeen let a consumer add or remove on a live host: X6 (`graph.use`,
`disposePlugins`), G6 (`setPlugins`), Chart.js (`Chart.register`/`unregister`, or splicing the inline `config.plugins`
array), CodeMirror (`Compartment.reconfigure`, `StateEffect.appendConfig`), ProseMirror
(`state.reconfigure({plugins})`), xterm.js (`loadAddon`, then the addon's own `dispose`), GrapesJS (`Plugins.add` and
`Plugins.remove`, since 0.23.1) and Shopify draggable (`addPlugin`/`removePlugin`). Tiptap is a half case: ProseMirror
plugins can be registered and unregistered on a live editor, its own extension set cannot, and
`editor.setOptions({extensions})` type-checks while doing nothing at runtime. countUp.js is a curiosity rather than a
design: its single plugin slot is a public field, so it can be swapped live, undocumented. Seven offer nothing:
maxGraph, bpmn-js, LogicFlow, PrismJS, ECharts, Cytoscape and auto-animate.

Two observations about that split. Being a browser library decides nothing, both camps are well populated. And the
capability is largely **undocumented even where it exists**: X6's `disposePlugins`, `enablePlugins` and
`disablePlugins` have zero hits in the repository's markdown, Chart.js documents `register`/`unregister` but never
runtime mutation of a chart's plugin list, and countUp's live slot appears in no documentation at all.

**Removal is where the designs actually diverge**, and that is the part that bears on this package. Three behaviors:

- *Teardown runs, per plugin.* X6 (`dispose` is a required member of its plugin interface), G6 (a keyed
  enter/update/exit diff calls `destroy` on the exiting instances only), GrapesJS (`cleanup`), draggable (`detach`),
  xterm.js (the addon manager overwrites the addon's own `dispose` so that calling it also unregisters).
- *Teardown runs, but not selectively.* ProseMirror destroys and rebuilds **every** plugin view whenever the plugin
  array changes, so unrelated plugins pay for one removal. CodeMirror splits by kind: `ViewPlugin.destroy` runs, while
  a `StateField` has no teardown at all and its value is silently dropped.
- *Teardown is partial or absent.* Chart.js calls `stop` on removal but never `uninstall`, so a plugin that cleans up
  in `uninstall` leaks on every live removal. countUp, Cytoscape, PrismJS and ECharts have no teardown hook to call in
  the first place.

ECharts is the most instructive refusal in the corpus. Its scheduler copies the processor arrays at instance
construction, with a source comment stating that incremental registration is not supported by its stream
architecture. A component type registered late is therefore picked up by a subsequent `setOption` while its
processing stages never are. Half-applied is worse than refused, and the library says so in its own code.

**What it would cost here.** Nothing is dynamic today: `registerPlugins` runs from the constructor
(`plugins-support.ts:150-165`), the map is `private readonly`, and there is no `addPlugin`, `removePlugin`,
`hasPlugin` or `getPlugins`. Adding the capability raises four questions that are contract changes, not method
signatures.

1. `onConfigure` is documented as running "once, after all plugins have been constructed", and the implementation
   honors it with a second loop over the whole map. A plugin registered later cannot be given that guarantee: it
   would receive `onConfigure` alone, with every other plugin already live. Either the contract is reworded, or late
   arrivals get a different hook.
2. `onDispose` exists only at instance granularity. `dispose()` calls it on every plugin, then releases the core. A
   `removePlugin` must call it on exactly one, which raises the error isolation question of section 2.3 again: a
   plugin that throws while being removed must not leave the map half updated. X6, G6, GrapesJS and draggable all
   made teardown per plugin from the start, which is markedly cheaper than retrofitting it.
3. A plugin added after a `load` has never seen `onBeforeLoad` or `onLoadSuccess`, so it starts against an
   already-rendered diagram with empty state. Either the host replays `onLoadSuccess` at registration when a model is
   present, which changes the meaning of the hook from "a load just succeeded" to "a model is available", or every
   plugin author duplicates their initialization logic. This is the same class of problem as the ECharts refusal.
4. Removal turns the absent dependency mechanism from latent debt into a defect. Today a plugin that fetches another
   with `getPlugin` at use time tolerates `undefined` by accident; once removal exists, that `undefined` becomes a
   state every correct plugin must handle.

**The tension with the recommendation is worth naming.** Alternative F option 3 types `features` from the plugin tuple
passed to the constructor, so a plugin registered afterwards cannot appear in that type: the static shape is fixed at
the construction site by design. Dynamic management and a constructor-derived static type pull in opposite
directions. Only the augmentable-interface variant of alternative A survives both, because its id-to-type map is
declared at module scope rather than derived from one call site, which is an argument for A that has nothing to do
with the cast.

**A cheaper subset exists.** Enable and disable, keeping the plugin registered, is a much smaller change: no
construction, no teardown, no hook replay, and Chart.js shows it working as a plain options flag. It covers a good
share of what "dynamic" is usually wanted for. It is not free either, since every hook dispatch has to consult the
flag, but it touches no published contract. If any of this is pursued, it is the place to start.

## 4. Comparison

Columns trimmed to the axes that discriminate. "Cast" means the consumer must assert a type the compiler cannot check.
Build-time Node tools (Vite, Rollup, ESLint) are excluded: their loading model resolves plugins by package name at
runtime, which a browser library cannot do. One idea from them transfers, noted in 5.C.

| | Load by | Retrieve by | Cast | Deps | Global state | Feature reads as native  Dynamic |
|---|---|---|---|---|---|---|---|
| **addons (today)** | class | string id | yes | no | none | no | no |
| maxGraph 0.24 | class | string id | yes | no | none | no | no |
| bpmn-js 18 | module map | string id | yes | `__depends__` | none | no | no, injector frozen |
| X6 3.1 | instance | string id (undocumented) | yes | no | prototype patching, CSS | yes | add, remove, disable |
| G6 v5 | **string id** | `getPluginInstance(key)` | yes, double | no | global registry | partly | swap the set, keyed diff |
| LogicFlow 2.x | class, global or per instance | `lf.extension.<name>` | **worse than a cast** | no | static registry | inconsistent, three idioms | no |
| Chart.js 4 | object with an id | id, rarely needed | no | no | registry singleton | yes, via options | add, remove, disable |
| CodeMirror 6 | value | typed handle | **no** | `enables` | none | mostly | swap, per compartment |
| ProseMirror 1 | instance | typed `PluginKey<T>` | **no** | no | none | yes, via exported functions | swap the set |
| Tiptap 3 | factory result | **nothing to retrieve** | **no** | no | type augmentation is global | **yes** | ProseMirror plugins only |
| xterm.js 5/6 | instance | **nothing to retrieve** | **no** | no | none | no, deliberately | add; remove via the addon |
| countUp.js 2 | instance, single slot | **nothing to retrieve** | **no** | no | none | no | one slot, swappable |
| GrapesJS 0.23 | function | bookkeeping model only | n/a | no | none | yes | add, remove |
| PrismJS 1.30 | side-effect import | `Prism.plugins.X` by convention | untyped | build metadata only | **everything** | yes | no |
| ECharts 5/6 | installer function | **nothing to retrieve** | **no** | runtime topological | permanent global registry | yes, via options | no |
| draggable 1.2 | class | **nothing to retrieve** | **no** | no | none | n/a, no API | add, remove |
| Cytoscape 3 | global `use()` | prototype method | n/a | no | heavy | yes | no |
| auto-animate 0.10 | callback, single slot | **nothing to retrieve** | **no** | no | observers created at import | n/a, no API | no |

Two observations matter more than the table.

**Retrieval by an author-written string is the minority design**, and every library that does it pays with an
unchecked cast. LogicFlow is the cautionary case: `lf.extension.<name>` resolves to `Extension | ExtensionDefinition`,
a two-member union, so **the pattern its own documentation teaches does not compile**, and the class carries
`[propName: string]: any`, so a typo compiles clean and yields `undefined`. Adding a string-keyed accessor without
solving the typing produces something worse than the cast it replaces.

**Transparency has two proven mechanisms, not one.** X6 and Cytoscape patch the host prototype, which is page-global
and defeats tree-shaking. Tiptap instead merges declarations into an already-typed namespace object, so
`editor.commands.undo()` needs no cast, no string and no lookup. The second is far better suited here.

## 5. Alternatives

### A. Typed id-to-type map via declaration merging

The core declares one empty interface. Every plugin, shipped or third-party, adds one entry to it by module
augmentation. `getPlugin` then keys on `keyof` that interface.

```ts
// core, in plugins-support.ts
export interface BpmnPluginRegistry {}                 // empty, and crucially NO index signature

export type PluginId = keyof BpmnPluginRegistry;       // replaces DefaultPlugins and PluginIds entirely

getPlugin<K extends PluginId>(id: K): BpmnPluginRegistry[K] | undefined {
  return this.plugins.get(id) as BpmnPluginRegistry[K] | undefined;
}
```

Three properties follow, and the third is what makes this more than a typing fix.

**1. The id set closes itself.** `PluginId` is derived, never written by hand, so registering a plugin extends the
accepted ids automatically and nothing can drift. This deletes `DefaultPlugins` (`plugins-support.ts:115`) and with it
weakness 2.1 point 3, where the five id literals exist twice, once in the type and once in each `getPluginId()` body,
kept in sync by hand. A free string is no longer accepted, so a typo is a compile error rather than `undefined`:

```ts
bpmnVisualization.getPlugin('overlays');   // OverlaysApi | undefined
bpmnVisualization.getPlugin('ovarlays');   // error: not assignable to keyof BpmnPluginRegistry
```

**2. The type argument disappears.** `K` is inferred from the id, so the two can no longer disagree. Nothing is left
at the call site to write incorrectly.

**3. The map holds a capability interface, not the implementation class.** Declare, per plugin, an interface with only
the methods consumers are meant to call, and register *that*:

```ts
// public contract: what consumers see, and what the registry publishes
export interface OverlaysApi {
  addOverlays(elementId: string, overlays: Overlay | Overlay[]): void;
  removeAllOverlays(elementId: string): void;
  setVisible(visible: boolean): void;
}

// implementation: free to carry internals that never reach the published API
export class OverlaysPlugin implements Plugin, OverlaysApi {
  getPluginId(): string { return 'overlays'; }
  // ...
}

declare module '@process-analytics/bpmn-visualization-addons' {
  interface BpmnPluginRegistry { overlays: OverlaysApi }
}
```

What that buys, beyond typing:

- **Encapsulation.** `getPlugin('overlays')` returns `OverlaysApi`, so internal methods, the cached overlay pane
  (`plugins/overlays.ts:27-28`) and the lifecycle hooks themselves stay out of the consumer-facing surface. The class
  remains exported for registration; only the interface is published as the contract.
- **A free hand on the implementation.** Renaming or restructuring the class stops being a breaking change as long as
  the interface holds. Today the class *is* the published type, so every internal is public by accident.
- **It settles the naming question mechanically.** The consumer-facing type is named after the capability rather than
  the mechanism, so the call site reads `const overlays: OverlaysApi = ...`. That is what
  `demo/src/plugins-by-name.ts:42` does by hand today, enforced by the type system instead of by convention.
- **Discoverability**, the gap in section 3 that no library in the survey answers. `BpmnPluginRegistry` becomes a
  single machine-readable list of every available feature and its API, assembled automatically from whatever plugin
  packages are installed.

A third-party plugin is symmetric, and needs no cooperation from this package:

```ts
export interface HighlightApi { highlight(bpmnElementId: string): void }
export class HighlightPlugin implements Plugin, HighlightApi { /* ... */ }

declare module '@process-analytics/bpmn-visualization-addons' {
  interface BpmnPluginRegistry { highlight: HighlightApi }
}
```

```ts
const bv = new BpmnVisualization({ container, plugins: [OverlaysPlugin, HighlightPlugin] });
bv.getPlugin('highlight')?.highlight('Task_1');   // typed, autocompleted, no cast, no class type imported
```

This is Chart.js's mechanism applied to retrieval instead of options, and what bpmn-js's `Diagram<ServiceMap>` type
parameter tries to do but never populates. Tiptap's `interface Storage {}` is the same trick on a property.

#### Where the augmentation goes, and why it differs inside and outside the package

**Inside this repository, do not use the npm package name.** `packages/addons/tsconfig.json` sets
`"moduleResolution": "node"`, which ignores the `exports` field and does not support package self-reference. The npm
workspace nonetheless symlinks `node_modules/@process-analytics/bpmn-visualization-addons` to `packages/addons`, so
the specifier *does* resolve, through `"types": "./lib/index.d.ts"`, to the **compiled output**. That is a different
module identity from `src/plugins-support.ts`, which is what the sources import, so the augmentation would target the
wrong module while appearing to work, and `src` would start depending on `lib/` existing, breaking a clean checkout
and any build after `npm run clean`.

Two correct options for the shipped plugins:

```ts
// (a) preferred: no augmentation at all, declare the entries where the interface lives
// plugins-support.ts
import type { OverlaysApi } from './plugins/overlays.js';
import type { StyleApi } from './plugins/style.js';

export interface BpmnPluginRegistry {
  overlays: OverlaysApi;
  style: StyleApi;
}
```

```ts
// (b) alternative: augment by relative path, keeping each entry next to its plugin
// plugins/overlays.ts
declare module '../plugins-support.js' {
  interface BpmnPluginRegistry { overlays: OverlaysApi }
}
```

(a) is simplest and has no resolution subtleties. The type-only cycle it creates (core imports plugin API types,
plugins import `Plugin` from core) is erased at compile time, and `isolatedModules: true` already forces `import type`
for it. (b) mirrors what third parties write and keeps each entry beside its plugin, at the cost of a relative
specifier that must carry the `.js` extension like every other import here.

**Outside the package, the npm package name is the only option available**, because `exports` publishes just `.` and
`./package.json`, with no subpath for `plugins-support`. Since `src/index.ts` is a pure barrel
(`export * from './plugins-support.js'`), a third-party `declare module '@process-analytics/bpmn-visualization-addons'`
augments a module that **re-exports** the interface rather than declaring it. Whether that merges was the single
biggest risk to this alternative, and it was the problem Vue hit with `ComponentCustomProperties`, where users had to
augment `@vue/runtime-core` until Vue restructured so that augmenting `vue` worked.

**Verified by compilation: it merges.** Probed with TypeScript 5.9.2 against a real `node_modules` package built from
emitted declarations, not a `paths` mapping. `declare module 'my-pkg' { interface PluginRegistry { overlays: OverlaysApi } }`
merges into the interface declared in the sub-module, and the result is visible from the root import, from a subpath
import, and from inside the library's own code, so `getPlugin('overlays')` correctly yields `OverlaysApi | undefined`.
A negative control confirmed `keyof PluginRegistry` is genuinely `never` without the augmentation, so these are not
false positives. It also works under `moduleResolution: bundler` with an `exports` map exposing only `"."`, where the
subpath specifier is unresolvable.

So **no restructuring is needed**: keep the interface in `plugins-support.ts` and leave the barrel as it is. Two
conditions to document instead:

- the file containing `declare module` must be part of the program. It does not need to be imported; being inside
  `tsconfig`'s `include` is enough.
- the probe used the two-file emitted layout (`index.d.ts` plus `plugins-support.d.ts`), which is what this package
  produces today (`declaration: true`, `outDir: ./lib`, no declaration bundling). If the build ever moves to a single
  rolled-up `.d.ts`, this needs re-checking.

#### How the id is declared: instance method versus static field

The two implementations diverge here, and the choice constrains everything above.

```ts
// this package: the id is an instance method, and the only mandatory member of the contract
export interface Plugin {
  getPluginId(): string;          // plugins-support.ts:35
  onConfigure?: ...               // every other member optional
}
getPluginId(): string { return 'overlays'; }        // plugins/overlays.ts:52
```

```ts
// maxGraph: the id is a static, declared on the CONSTRUCTOR type
export interface GraphPluginConstructor {
  pluginId: PluginId;
  new (graph: AbstractGraph): GraphPlugin;
}
export interface GraphPlugin { onDestroy: () => void; }    // the instance side carries no id
```

The consequence shows up in the registration loop:

```ts
// this package: construct, then ask, then check           plugins-support.ts:152-158
const plugin = new constructor(this, options);
const pluginId = plugin.getPluginId();
if (this.plugins.has(pluginId)) { throw new Error(/* ... */); }

// maxGraph: ask, then construct                           AbstractGraph.ts:456
options?.plugins?.forEach((p) => this.plugins.set(p.pluginId, new p(this)));
```

| | `getPluginId()` method (this package) | `static pluginId` (maxGraph) |
|---|---|---|
| Id known before construction | no | **yes** |
| Duplicate detected before side effects run | no: the duplicate is fully constructed first, and the throw escapes after `super(options)` built the graph, leaking it | **yes**, in principle |
| Duplicate handling | **throws, fail-fast**, tested three ways | silent overwrite, last wins |
| Enforced at the class declaration | **yes**, `implements Plugin` requires it | no: `implements GraphPlugin` checks only the instance side |
| Enforced where it matters (registration) | yes, via `PluginConstructor` returning `Plugin` | yes, when the class enters `GraphPluginConstructor[]` |
| Reachable at the type level | **no**: return type is `string`, and an instance is needed | **only if declared `readonly`**, and maxGraph does so for just 5 of its 10 built-ins, see below |
| Visible in the published `.d.ts` | no: only `getPluginId(): string`, the value lives in an unemitted method body | **yes** when `readonly`: emits `static readonly pluginId = "overlays"` |
| Usable as a rename-safe constant | no | **yes**: `getPlugin(OverlaysPlugin.pluginId)` |
| Can vary per instance | yes, though it is called exactly once (`plugins-support.ts:154`) so a varying id is a latent bug rather than a feature | no, which is correct: the id identifies the type, not the instance |
| Inherited by a subclass | yes, and the suite covers the resulting collision | yes, same hazard, same fix (redeclare) |

**What this package does better**: fail-fast on duplicates, which is the strictest behavior in the whole survey and
strictly better than maxGraph's silent overwrite; and the id cannot be forgotten, because `getPluginId()` is a
mandatory member of an interface every plugin implements.

**What maxGraph does better**: everything that follows from the id being knowable without an instance. The duplicate
check can run before any constructor executes, so the "already built, now leaking" problem in 2.3 disappears rather
than being worked around. The id becomes a type-level value, which is the prerequisite for deriving `PluginId` from
the plugins actually passed (option 3 for F). It appears in the emitted declarations, so a consumer reading the
typings can see that `OverlaysPlugin` is `'overlays'` without opening the source, which today is impossible: the
method body is not emitted, so the `.d.ts` says only `getPluginId(): string`. And it can be used as a constant at the
call site instead of a bare literal.

**The cost of moving.** Two real ones. It is breaking for plugin authors, who must move the id from a method to a
static field, though the two can coexist during a deprecation window by reading the static and falling back to the
method. And the `Plugin` interface would lose its only mandatory member, becoming a bag of optional hooks that
`implements Plugin` no longer meaningfully checks. The fix is maxGraph's: put the requirement on the constructor type,
`PluginConstructor`, which is where registration happens and therefore where it is load-bearing.

**`readonly` is not optional, and maxGraph shows why.** Its ten built-in plugins split evenly:

```ts
static pluginId = 'TooltipHandler';              // TooltipHandler.ts:47   -> type widens to string
static readonly pluginId = 'fit';                // FitPlugin.ts:88        -> type is the literal 'fit'
```

A plain `static` property is mutable, so TypeScript widens the initializer to `string` and every type-level benefit in
the table above evaporates. `TooltipHandler`, `PanningHandler`, `PopupMenuHandler`, `CellEditorHandler` and
`RubberBandHandler` are declared that way; `FitPlugin`, `ImageBundlePlugin`, `SelectionCellsHandler`,
`SelectionHandler` and `ConnectionHandler` use `static readonly` and keep the literal. Nothing in
`GraphPluginConstructor` requires `readonly`, so the inconsistency is invisible until someone tries to use the id as a
type. If this package adopts the static field, `readonly` must be part of the contract from the start.

**Both implementations duplicate the id literals.** maxGraph hand-maintains `BuiltinPluginId` as a ten-member union in
`types.ts:1232-1249`, exactly as this package hand-maintains `DefaultPlugins` (`plugins-support.ts:115`), and in both
cases the literals also exist on the plugins themselves. Deriving the id union from the registry, as A does with
`keyof`, removes that duplication on both sides, which is another reason the change is worth proposing upstream.

**maxGraph pays the cast internally too.** Its own code calls `this.getPlugin<TooltipHandler>('TooltipHandler')` at
`AbstractGraph.ts:495` and `this.getPlugin<PanningHandler>('PanningHandler')` at `:652`. The unchecked cast is not
only a consumer-facing wart there; the library uses it on itself.

**What the compiler actually does**, probed with TypeScript 5.9.2 under the project's own settings:

- `static readonly pluginId = 'overlays'` yields the literal `'overlays'`. Dropping `readonly` yields `string`. Adding
  **any** type annotation yields that annotation, so `static readonly pluginId: PluginId = 'overlays'` destroys the
  literal and, worse, makes every plugin report the whole `PluginId` union, which defeats per-plugin discrimination
  entirely. Use `static readonly pluginId = 'overlays' satisfies PluginId` when the union must still be enforced:
  that keeps the literal and validates it.
- `implements` checks only the instance side, so a class missing the static compiles silently and the error surfaces
  later, at whichever consumer array literal or call argument it reaches. Three constructs force the check at the
  plugin's own file: a bare `OverlaysPlugin satisfies PluginConstructor;` statement after the class, a
  `static { OverlaysPlugin satisfies PluginConstructor }` block inside it, or a `definePlugin<T extends
  PluginConstructor>(ctor: T)` helper. The `satisfies` statement is the cheapest; the static block is harder to
  forget because it lives in the class body.

**Recommendation**: adopt `static readonly pluginId`, with no type annotation, keep the fail-fast duplicate check, and
move it before construction. Add a `satisfies PluginConstructor` check next to each plugin class so a missing or
mistyped id fails where it is written. That combination is strictly better than either implementation today, and it is
a prerequisite for the more ambitious typing in F.

#### Static side, instance side, or both

The previous section compared "id as a method" against "id as a static". There is a third position, an instance
property, and it is not equivalent to either. All figures below are compiled results, TypeScript 5.9.2.

| | (a) id before construction | (b) id at the type level | (c) id inside instance methods | enforced at the class declaration |
|---|---|---|---|---|
| `getPluginId()` method (today) | no | **no** | `this.getPluginId()` | yes, `implements Plugin` requires it |
| `static readonly pluginId` | **yes**, `Ctor.pluginId` | yes, `P[number]['pluginId']` | needs a cast or a hardcoded class name | **no**, silent until a use site |
| `readonly pluginId` (instance) | no | yes, `InstanceType<P[number]>['pluginId']` | **`this.pluginId`**, literal intact | **yes**, TS2420 on the class |
| both | **yes** | yes, either path | **`this.pluginId`** | yes |

Your intuition about method access is right, and the compiler is blunter about it than expected: `this.constructor` is
typed `Function`, so `this.constructor.pluginId` does not compile at all (TS2339). A plugin whose id is only static
must write `OverlaysPlugin.pluginId`, hardcoding its own class name, or `(this.constructor as typeof
OverlaysPlugin).pluginId`. Both keep the literal, but casting to the *interface* instead,
`(this.constructor as PluginConstructor).pluginId`, silently degrades to `string`, because that is how the interface
declares it.

Two further findings change the balance:

- **The instance side restores declaration-site enforcement.** `implements Plugin` catches a missing id with TS2420
  on the offending class, and a wrong type with TS2416 on the member itself. The static side cannot be checked by
  `implements` at all, which is why the previous section needed a `satisfies` statement or a `static {}` block as a
  workaround. Putting the id on the instance makes those workarounds unnecessary.
- **Plugin families need the instance side.** `abstract static` does not exist (TS1243), so a base class can never
  oblige subclasses to declare a static id. With `abstract readonly pluginId: string` it can, and each concrete
  subclass keeps its own literal. Note that in both variants, redeclaring a *concrete* id in a subclass is an error
  (TS2417 for statics, TS2416 for instances), so subclassing a shipped plugin to rebrand its id is not available
  either way.

**Recommendation: carry both**, with the instance half derived from the static half so they cannot drift:

```ts
export class OverlaysPlugin implements Plugin {
  static readonly pluginId = 'overlays';
  readonly pluginId = OverlaysPlugin.pluginId;
}
```

This is the only shape that satisfies all three needs at once: duplicate detection reads `Ctor.pluginId` before any
constructor runs, methods read `this.pluginId` with the literal intact, and the generic host of F can key off either
side. Prefer the static path for the generic host, since it does not require the constructor type to carry an instance
shape.

Four rules the probes imply, worth enforcing in review:

- Never annotate the id on either side. `: string` and `: PluginId` both destroy the literal. Use
  `= 'overlays' satisfies PluginId` if the union must still be validated.
- Never use a bare getter for the instance half: an inferred getter widens to `string` and silently breaks the generic
  host. Use a plain `readonly` field, or annotate the getter.
- Never use a constructor parameter property with a default, which widens even with `readonly`.
- Keep a `satisfies PluginConstructor` statement only if the static half must be enforced too, since `implements`
  cannot see it.

One thing left unverified: the probes ran on sources, not on emitted declarations. Before committing to the duplicated
pair, run `emitDeclarationOnly` against a real plugin to confirm the instance field's declared type survives the emit.

#### Two variants, differing on semver

- **A1, additive.** Keep a second loose overload, `getPlugin<T extends Plugin>(id: string): T | undefined`, below the
  typed one. Every existing call site keeps compiling, explicit type arguments included. Ships in a minor release.
- **A2, strict.** Typed overload only, ids constrained to `keyof BpmnPluginRegistry`. This is the version described
  above, and it **is breaking**: `getPlugin<OverlaysPlugin>('overlays')` no longer compiles, because `K` is inferred
  from the id and a class type is not assignable to a string union. Every call site passing an explicit type argument
  must drop it, which in this repo means 4 sites in the demo and 22 of 24 in the tests, all mechanical deletions.

Measured behavior, TypeScript 5.9.2:

| Shape | `getPlugin('overlays')` | `getPlugin('typo')` |
|---|---|---|
| typed overload first, loose second (A1) | `OverlaysApi \| undefined` | compiles, `Plugin \| undefined` |
| loose overload first (ordering mistake) | **`Plugin \| undefined`**, typed one shadowed | compiles |
| typed only (A2) | `OverlaysApi \| undefined` | **TS2345**, rejected |
| single conditional signature | `OverlaysApi \| undefined` | compiles, `Plugin \| undefined` |

Two conclusions. Overload **order is load-bearing**: put the loose one first and the typed one never fires, silently,
which is the failure mode I expected and it is real. And the loose overload admits typos in either order, which is the
core argument against A1 as an end state.

If a dynamic escape hatch must remain, prefer a **single conditional signature** over two overloads, since it gives
A1's tolerance without the ordering hazard:

```ts
getPlugin<K extends keyof BpmnPluginRegistry | (string & Record<never, never>)>(
  id: K,
): (K extends keyof BpmnPluginRegistry ? BpmnPluginRegistry[K] : Plugin) | undefined;
```

Otherwise go straight to A2, which is the only shape that rejects `getPlugin('typo')`.

#### Implementation warnings

**No index signature, learned from ECharts.** Its `ComposeOption` pattern was compiled empirically with TypeScript
5.5 in strict mode: it catches wrong series subtypes and wrong values, but does **not** catch options for a component
that was never registered, nor invented keys, because an index signature on `ECUnitOption` swallows unknown keys as
`unknown`. LogicFlow fails the same way with `Record<string, Extension>`. `PluginIds` at `plugins-support.ts:120`
currently has exactly that widening shape, `DefaultPlugins | (string & Record<never, never>)`, and it must not survive
into the registry.

**Augmentation becomes mandatory under A2.** A plugin that does not augment `BpmnPluginRegistry` cannot be retrieved
through the typed API at all. That is the intended pressure, but it belongs in the documented authoring contract
rather than being discovered. If a genuine dynamic case appears, add an explicitly named escape hatch such as
`getPluginUnsafe<T>(id: string): T | undefined`, so the unsound path is visible at the call site instead of being the
default.

**It still cannot prove the plugin was loaded.** The registry says a feature exists in the program, not that it was
passed to this instance, which is why the return type must become `| undefined` alongside.

### B. Instance-based loading

```ts
// before
const bv = new BpmnVisualization({ container, plugins: [OverlaysPlugin] });
const overlaysPlugin = bv.getPlugin<OverlaysPlugin>('overlays');
overlaysPlugin.addOverlays(id, overlay);

// after
const overlays = new OverlaysPlugin({ someOption: true });
const bv = new BpmnVisualization({ container, plugins: [overlays] });
overlays.addOverlays(id, overlay);
```

xterm.js, countUp.js and X6. It dissolves the asymmetry at its root: the consumer already holds a correctly typed
reference, so retrieval becomes optional and exists only for cross-plugin lookup. Per-plugin options become ordinary
typed constructor arguments, which removes the namespacing convention, the double-passing of `GlobalOptions` and the
need for `onConfigure` in most cases.

countUp.js shows the payoff precisely: its core option type contains **zero** knowledge of any plugin's option shape.
Draggable shows the alternative cost of not doing this: because plugins are classes the library instantiates, the only
place options can be typed is the core interface, so `swapAnimation?: SwapAnimationOptions` is hard-coded into
draggable's own public typings.

Requires an `init(bpmnVisualization)` hook, since construction and binding must separate.

### C. Host API augmentation

Each plugin installs its methods on `BpmnVisualization` so the consumer writes `bpmnVisualization.addOverlays(...)`.
This is X6 and Cytoscape.

Rejected as the primary design. It rebuilds the monolithic API a plugin system exists to avoid, it makes a missing
plugin a silent no-op (verified in X6: `graph.select()` without the plugin returns `this` and does nothing), it
requires page-global prototype patching, and every consumer pays the type-surface cost of every plugin. See F for the
version of this idea that survives scrutiny.

If ordering is ever added, Rollup's `enforce: 'pre' | 'post'` is the one build-tool idea that transfers, and it is the
same shape as CodeMirror's `Prec` buckets.

### D. Typed token, ProseMirror `PluginKey`

`const overlays = bv.get(overlaysToken)`. Kills the cast, makes collisions impossible by construction (the underlying
string is generated and disambiguated), and allows real encapsulation, since a package can keep its token private and
export only functions. The most principled option, and the least aligned with the current codebase.

### E. Global id-to-implementation registry, load by id

The design the review was originally asked about. G6 v5 implements it exactly:

```ts
register(ExtensionCategory.PLUGIN, 'my-plugin', MyPlugin);
const graph = new Graph({ plugins: ['grid-line', { type: 'tooltip', key: 'my-tooltip' }] });
```

It makes loading and retrieval symmetric and makes configuration serializable, so a viewer could name a plugin the
calling code never imported. Rejected on evidence from the reference implementations:

- **It does not buy tree-shaking.** G6 documents no tree-shaking rationale anywhere, has no `sideEffects` field and no
  lighter entry point, and `preset.ts` registers every built-in on import. ECharts is the counter-example that proves
  the point is about *installer functions*, not about ids: it gets real tree-shaking because `use()` takes values the
  bundler can see, not because anything is named by string.
- **It costs the property this package has and G6 does not.** Re-registering an id affects every graph on the page,
  including already-constructed ones, with no way to scope an override.
- **It does not fix type safety.** G6's `type` is a bare `string`; its own test asserts `{ type: 'unset' }` compiles.
- **It weakens error handling**: a missing registration in G6 is a warning and a silently skipped plugin.

LogicFlow shows the one genuinely valuable part of this design, and it is separable: registering the **class** globally
while instantiating **per instance** lets an application declare its plugin policy once, with per-instance override and
subtraction. That capability is worth having and does not require id-based loading.

### F. Namespaced accessor typed by an augmentable interface

F is **the same registry as A, reached as a property instead of through a method call**. It adds no second mechanism:
a plugin augments `BpmnPluginRegistry` once and gets both access shapes.

```ts
// core
get features(): Partial<BpmnPluginRegistry> {
  return this.featuresView;      // built at registration: featuresView[pluginId] = plugin
}
```

```ts
// A:  the id is an argument
bpmnVisualization.getPlugin('overlays')?.addOverlays(id, overlay);

// F:  the id is a property name
bpmnVisualization.features.overlays?.addOverlays(id, overlay);
```

The runtime side is trivial: `registerPlugins` already walks the constructed plugins (`plugins-support.ts:152-159`),
so it assigns each one onto a plain object keyed by its id. No proxy, no prototype patching, no code generation.

Why have it at all, given A:

- **No string appears at the call site.** In A the id is still a string literal, checked but written. In F it is a
  property name, so it autocompletes as you type the dot and is renameable by ordinary tooling.
- **It reads as a feature namespace.** `bpmnVisualization.features.overlays.addOverlays(...)` names the capability
  twice and the plugin mechanism zero times. This is the closest the survey gets to the transparency X6 and Cytoscape
  achieve by prototype patching, without patching anything and without the silent no-op that comes with it.
- **The registry doubles as a browsable catalogue.** Typing `bpmnVisualization.features.` in an editor lists every
  feature available in the program, which is the discoverability gap from section 3.

Three design points that decide whether it works:

**`Partial<>` is deliberate.** The registry says a feature exists in the program; only the constructor argument
decides whether it exists on this instance. Typing `features` as `Partial<BpmnPluginRegistry>` forces `?.` at the call
site and keeps the type honest. The ergonomic alternative, typing it non-optional and throwing from a proxy on a
missing key, reads better but lies, which is exactly Tiptap's failure mode: its augmentation applies because a package
sits in the dependency graph, whether or not the extension was ever passed to the editor. Prefer the honest form; the
`?.` is one character and it is telling the truth.

**No index signature, again.** An un-augmented key must be a compile error, not `any`. This is the precise point where
LogicFlow's `lf.extension`, typed `Record<string, Extension | ExtensionDefinition>`, fails: it accepts every key,
resolves them all to a two-member union, and makes the pattern its own documentation teaches fail to compile.

**The capability interfaces from A carry over unchanged.** `features.overlays` is an `OverlaysApi`, not an
`OverlaysPlugin`, so the namespace exposes only the published contract.

Naming: `features` states the intent. `extensions` invites confusion with LogicFlow's, and `plugins` reintroduces the
vocabulary this alternative exists to remove.

#### The decisive benefit: discovery without prior knowledge

Everything else F does, A does too. What only F does is let a consumer **find** a feature by navigating the API. They
type `bpmnVisualization.features.` and the editor lists what exists, with each entry carrying its capability
interface and its JSDoc. Nothing has to be read first: not the README, not the plugin list, not the id of anything.
Under A the consumer still has to know that ids exist as a concept, and that `'overlays'` is one of them, before
autocomplete can help.

That is the single largest usability gain available here, and no library in the survey provides it. Chart.js gets
close for options but not for behavior. X6 and Cytoscape get it by prototype patching, which costs page-global
mutation and silent no-ops. Tiptap gets it for commands at the price of soundness.

#### The decisive constraint: it works per package, not per plugin

Module augmentation is applied by a **module being in the program**, not by a plugin being loaded. That has an
asymmetric consequence, and it lands on the producer rather than the consumer:

- **A third-party plugin in its own npm package behaves well.** Its entry appears in `features` only if the consumer
  installed and imported that package, which correlates with intent.
- **Plugins shipped inside this package behave badly.** The core would declare all five entries unconditionally, so
  every consumer sees `css`, `elements`, `overlays`, `style` and `style-by-name` in autocomplete whether or not they
  passed any of them to `plugins:`. Discovery is maximal and honesty is minimal: the feature the consumer just found
  by autocompleting may not be loaded, and using it fails at runtime.

So the mechanism helps the consumer most exactly where it misleads them most. Taken literally it argues for shipping
every plugin as its own package, which is a real cost: more release machinery, version-compatibility surface between
plugins and core (already a gap in section 3), and shared internals like `BpmnElementsSearcher` would have to move
into a utility package rather than being an implementation detail. That may not be desirable, and it should not be
forced by a typing decision.

Three ways out, in increasing order of how well they resolve it:

1. **Accept it, with `Partial<>`.** The type never claims the feature is present, so the consumer writes `?.` and the
   compiler forces them to consider absence. Discovery stays complete. The residual defect is that a missing plugin
   becomes a silent no-op, which is X6's failure mode.
2. **Scope the augmentation to a subpath import.** Ship each built-in at its own entry point whose module carries the
   augmentation, so the entry only appears once the consumer imports that plugin, which they must do anyway to
   register it. This requires the root barrel to stop re-exporting the plugins, since importing anything from the root
   would otherwise pull every augmentation into the program. That is a packaging change of nearly the same weight as
   splitting into packages, but without the release machinery.
3. **Make the type reflect what was actually loaded.** Parameterize `BpmnVisualization` over the plugin array it was
   constructed with and derive `features` from it, so the core can declare all five entries while autocomplete offers
   only the loaded ones. This dissolves the objection rather than mitigating it, and no surveyed library implements it.

**Option 3 is viable. Verified by compilation**, TypeScript 5.9.2:

```ts
class BpmnVisualization<P extends readonly PluginConstructor[] = []> {
  constructor(options: GlobalOptions & { plugins?: P });
  get features(): Pick<BpmnPluginRegistry, Extract<P[number]['pluginId'], keyof BpmnPluginRegistry>>;
}
```

```ts
const bv = new BpmnVisualization({ container, plugins: [OverlaysPlugin] });
bv.features.overlays;   // OK
bv.features.style;      // TS2339: Property 'style' does not exist on type 'Pick<BpmnPluginRegistry, "overlays">'
```

The literal union survives without `as const`, inline or through a hoisted variable, and the `const` type-parameter
modifier changes nothing. Ids absent from the registry are dropped rather than erroring. Adding the type parameter
with a default is source-compatible, so existing consumers holding a bare `BpmnVisualization` still compile. The three
mechanisms compose: a third-party plugin augmenting the registry through the package root shows up in `features` on a
generic instance.

Two degradations to document if it is adopted:

- **Annotating the array collapses it.** `const plugins: PluginConstructor[] = [...]` widens `P` to the constraint, so
  `features` becomes `Pick<BpmnPluginRegistry, never>` and *every* access errors. That is a plausible thing to write
  and it fails confusingly rather than loosely.
- **Conditional composition is optimistic, not sound.** `[OverlaysPlugin, ...(flag ? [StylePlugin] : [])]` reports
  `'overlays' | 'style'`, so `features.style` type-checks even when the runtime did not load it.

So `features` is convenience typing, not proof of loading. Keep `getPlugin` returning `| undefined` as the honest
accessor alongside it.

Note that option 3 also requires the plugin id to be reachable **at the type level**, which the current
`getPluginId()` method cannot provide. See the id declaration discussion in 5.A.

### Comparison

| | Ergonomics | Type safety | Tree-shaking | Author cost | Semver | Migration |
|---|---|---|---|---|---|---|
| A1. Declaration merging, loose overload kept | unchanged | **fixed** where used | unchanged | one interface plus one augmentation | **additive** | none |
| A2. Declaration merging, ids closed | unchanged | **fixed** | unchanged | same | breaking | mechanical: drop the type argument at 26 call sites here |
| B. Instance loading | **much better** | **fixed** | unchanged | `init(bv)` instead of ctor arg | breaking | mechanical, one line per registration |
| C. Host augmentation | best | good | **worse** | augmentation plus prototype patching | breaking, permanently widens the API | large |
| D. Typed token | better | **fixed** | unchanged | export a token | breaking | moderate, new concept |
| E. Global registry | symmetric only | **not fixed** | **no gain** | a `register` call | breaking | large, adds global state |
| F. Namespaced accessor | **much better** | **fixed** | unchanged | one interface augmentation | additive if added beside `getPlugin` | none, opt-in |

## 6. Recommendation

**Ship A and F together now, plan B for the next major, reject C and E, keep D in reserve.**

A and F are one mechanism with two access shapes over a single augmented interface, so a plugin declares its entry
once and gets both. A keeps the existing call shape and fixes its typing; F gives new code a call site with no string
and no cast at all, and sits beside `getPlugin` rather than replacing it.

Register **capability interfaces** in the map, not implementation classes. That is what turns a typing fix into an API
improvement: it narrows the published surface to the methods consumers should call, frees the implementation to change
without breaking anyone, names the consumer-facing type after the capability rather than the mechanism, and makes the
registry a machine-readable catalogue of available features.

On sequencing, prefer A2 over A1 if a major release is within reach. A1 keeps a loose overload as an escape hatch and
therefore keeps the hole it is meant to close; A2 costs 26 mechanical call-site edits in this repo and closes it. Pair
either with the honest `| undefined` return type, which converts a runtime crash into a compile error, and with
`hasPlugin`/`getPluginIds` so "is it loaded" stops being unanswerable.

B remains the real answer to the asymmetry, and it also fixes per-plugin options typing, the largest authoring gap. It
is breaking, so it belongs in the next major; the migration is `plugins: [OverlaysPlugin]` becomes
`plugins: [new OverlaysPlugin()]`. A, B and F compose.

Weigh all of this against maxGraph before committing, since the two implementations are deliberately kept close
(see 7). A and F are the easier sell upstream: additive, no contract change, and maxGraph has the same unchecked cast
and the same `PluginId` union to hang the map on. B changes the contract, so agree it there first or the two designs
fork on the one axis they share.

On naming, no mechanism change is needed. Keep `Plugin` in class names and in the authoring contract, where it is
accurate. Make the consumer-facing convention name the capability, as `demo/src/plugins-by-name.ts:42` already does.
Under B and F the question largely dissolves, because the consumer names the variable once at construction, or reads
`features.overlays` and never says "plugin" at all.

Independently, fix the defects in 2.3. The substring match and the missing hook isolation are bugs today, and
`check-ts-support` should exercise the plugin API, since it is the only thing standing between the module augmentation
and a broken release.

## 7. Premise corrections

- **bpmn-js.** "Modules configured as objects, services retrieved by id from the injector" is correct but
  under-specified: a module is a declaration map binding a string id to a `['type'|'factory'|'value', impl]` tuple.
  More importantly its retrieval is **no safer than yours**. Compiled against the published packages with
  `strict: true`, `viewer.get('totallyNotAService')` yields `unknown` and `tsc` exits 0. It ships no service map for
  its own services and its documented pattern is a manual cast. What it has that you lack is `__depends__` with
  identity deduplication and deterministic topological ordering, and an event bus with priority and interception.
- **AntV X6 and AntV G6.** "Ids and implementations in a global registry, loading by id" is **wrong for X6** and
  **exactly right for G6 v5**. The description was accurate, the attribution was not. X6 passes a live instance to a
  per-graph `Set`; its global `Registry` serves routers, connectors, markers and tools, not plugins. G6 v5 matches
  every clause, and G6 v4 used the X6 model, so any claim about G6 needs a version. Contributing factors, both
  verified: the libraries are siblings with near-identical names, and `x6.antv.vision` still returns 200 while serving
  the v1 site, where these were `Graph` options rather than plugins.
- **LogicFlow.** Two corrections. It is **`lf.extension`, singular**; `LogicFlow.extensions` is the static global
  registry, and a repo-wide search for `lf.extensions` returns zero hits. And **interface augmentation is not
  available** there: `extension` is a class property typed `Record<string, Extension | ExtensionDefinition>`, not an
  interface, and TypeScript cannot retype an existing property by declaration merging. The confirmed parts: the id is
  a static class property, unreachable by the type system exactly as in maxGraph; registration is global or per
  instance; and same-name collisions are silent. One extra finding: when a plugin is registered both globally and per
  instance, 2.x installs and constructs it **twice**, and the global wins the `lf.extension` slot, contradicting both
  its docs and its own code comment. 1.x used a true either/or.
- **Event registration versus fixed methods.** Your instinct that the open event approach is more flexible is right
  about core evolvability: adding an extension point costs one `emit` and no interface change, which is how
  `@logicflow/extension` ships twenty plugins on an unchanged core. But LogicFlow's bus is **strictly weaker than
  bpmn-js's**. bpmn-js has listener priority, `stopPropagation`, `preventDefault` and return-value interception, which
  is what lets one plugin veto another; LogicFlow's is a plain synchronous notification bus with none of that, so
  interception is fragmented into unrelated APIs (`guards`, model rules). Its `EventArgs` is a `type` alias rather
  than an interface, so plugin-defined events can never be typed, and are `any` by design. If an event bus is added
  here, copy bpmn-js's, not LogicFlow's.
- **maxGraph is the model, not the substrate.** `bpmn-visualization@0.48.0` depends on `mxgraph@4.2.2`, and mxGraph
  has no plugin concept at all (zero occurrences of "plugin" in its 13k-line `mxGraph.js`). But per the maintainer,
  the maxGraph plugin implementation was the base for plugin support here, and improvements have been ported back.
  That explains the `BuiltinPluginId | (string & Record<never, never>)` idiom reproduced character for character at
  `plugins-support.ts:120`. **None of it is recorded in the repository**: greps for "maxGraph" across the full git
  history, the README and the ADR return nothing. ADR 0001 should state it, because it changes how a reader weighs
  every decision below it, and because the next person to touch this code will otherwise assume freedom to diverge.
- **The ECharts lineage claim does not hold as stated.** In maxGraph discussion #51 the ECharts mention comes from
  `mcyph`, in the opening post, and refers to the shape of a mock constructor API: "based on charting libraries like
  Apache eCharts", sketched as `plugins: [new Rubberband({...})]`, which passes **instances** and is the opposite of
  ECharts' installer-function model. `junsikshim`, who implemented the plugin system, never mentions ECharts; his
  stated motivation in #151 is per-instance handler overriding. A repo-wide search of merged maxGraph code and docs
  for "echarts" returns zero hits. The strong "inspired by Apache ECharts" wording appears in maxGraph PR #1130, an
  unmerged ADR authored by this package's own maintainer, so citing it here would be self-referential.

## 8. Not verified

- Bundle-size magnitudes are unmeasured throughout. Tree-shaking claims rest on `sideEffects` metadata and module
  structure, not on built bundles.
- Third-party sources are pinned by version, not by commit, with G6 the single exception. Several were read from
  moving branches (`main`, `master`, `dev`, `develop`) whose content may since have changed, and GrapesJS was read
  from `dev` rather than from a published release. See the versions table at the start of the appendix.
- Whether `OverlaysPlugin` tolerates a missing container (`plugins/overlays.ts:27`).
- Whether the non-nullable `getPlugin` return type is deliberate or an oversight.
- Chart.js plugin call ordering and G6 plugin DOM ordering are undocumented upstream and were read off the
  implementation, so neither is a contract.
- LogicFlow's global-plus-instance double installation is a source reading, not a runtime observation.
- The ECharts `ComposeOption` results in 5.A are the researcher's own `tsc` measurements, and they contradict the
  ECharts handbook's claim. Treat as reproducible measurement, not as documentation.
- The TypeScript probes behind 5.A and 5.F used `moduleResolution: node` and `bundler` only. `node16` and `nodenext`
  were not exercised, nor was a `typesVersions`-based package layout. They also assumed the two-file declaration
  output this package emits today; a future rolled-up single `.d.ts` would need re-checking.
- Editor behavior of the generic `features` type is unmeasured: `tsc` prints the alias `Pick<BpmnPluginRegistry,
  "overlays">` rather than an expanded member list, and neither tooltip rendering nor autocomplete quality inside
  `features.` was observed. Type-checking cost on a realistic project was not measured either.
- The id probes ran against sources, not against emitted declarations, so the recommended static-plus-instance pair
  should be checked once with `emitDeclarationOnly` on a real plugin before being adopted.
- ADR 0001 is still `status: draft` (`docs/adr/0001-plugin-support.md:2`), which `docs/README.md:13` defines as "not
  yet ready for review".
- `CLAUDE.md:60-67` lists only `getPluginId` and `onConfigure` under "Plugin Lifecycle", missing the four hooks added
  in 0.10.0.

## 9. Not covered here

Candidates for a follow-up, ranked by what would change a decision:

1. ~~A compiled probe of alternatives A and F.~~ **Done**, TypeScript 5.9.2, results folded into 5.A and 5.F. It
   resolved the barrel-augmentation risk (it merges, no restructuring needed), confirmed that overload order silently
   decides whether the typed signature fires, and confirmed that the generic host in F option 3 works. The probes are
   committed at [`tools/plugin-registry-probes/`](./tools/plugin-registry-probes/), one directory per question, with
   a runner and a verdict table in their README.
2. ~~Making `BpmnVisualization` generic over the plugin tuple.~~ **Done**, viable, with two documented degradations
   (see 5.F), probed in `q4-generic-host-features` and `r2-instancetype-extraction`. What remains is a judgement call
   rather than a question: whether the ergonomic risk of an annotated plugin array collapsing `features` to `never`
   is acceptable.
3. An audit of the five shipped plugins against the gap list in section 3.
4. The missing tests, enumerated: hook ordering across plugins, double `dispose()`, a throwing hook, `load()` after
   `dispose()`, the substring match, options validation.
5. A ready-to-paste ADR recording the maxGraph lineage, with the corrected ECharts attribution.
6. A prototype branch implementing A2 plus F on the five shipped plugins, which is now the only way left to learn
   anything the type system cannot answer: what the `features` hover type looks like in an editor, how autocomplete
   behaves inside it, and what the type-checking cost is on a real consumer project.

Deliberately excluded: bundle-size measurements (no alternative except E moves that axis), more libraries (seventeen
already produced three families; an eighteenth adds a row, not an insight), and effort estimates.

---

# Appendix: per-library detail

Grouped by the organizing question in the preamble.

## Versions and sources

Research performed 13 and 14 August 2026. The `Dynamic` column of section 4 and the subsection on dynamic
plugin management were researched separately on 20 August 2026, against the same versions listed below, by
reading the published artifacts on unpkg and the repository sources. **Only G6 was read at a pinned commit.** Everything else was read from a
moving branch or a version tag, so these readings are reproducible by version but not byte-exactly; where a branch is
named, its content may since have changed. Where a documentation site could not be fetched, the upstream markdown that
generates it was used instead, and that substitution is noted.

| Library | Version | Source read | Documentation | Caveats |
|---|---|---|---|---|
| maxGraph | `@maxgraph/core` 0.24.0 | [maxGraph/maxGraph](https://github.com/maxGraph/maxGraph), branch `main`, **commit `34a0d3c7ac9b1cd9f6b6b31e40ec5c1d18d01b4d`** (2026-08-12) | [plugins guide](https://maxgraph.github.io/maxGraph/docs/usage/plugins) | Docs carry an "API is subject to change" banner |
| mxGraph | 4.2.2 (the actual substrate) | [jgraph/mxgraph](https://github.com/jgraph/mxgraph), branch `master`, no SHA | none used | Read only to confirm it has no plugin concept |
| bpmn-js | 18.24.0 | [bpmn-io/bpmn-js](https://github.com/bpmn-io/bpmn-js), branch `develop`, no SHA | [walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/), [examples](https://github.com/bpmn-io/bpmn-js-examples) | Typing probe compiled against the published packages with TypeScript 5.9, `strict: true` |
| diagram-js | 15.24.0 | [bpmn-io/diagram-js](https://github.com/bpmn-io/diagram-js), branch `develop`, no SHA | same | |
| didi | 11.0.0 | [nikku/didi](https://github.com/nikku/didi), branch `main`, no SHA | [README](https://github.com/nikku/didi/blob/main/README.md) | Runtime probes were run against didi directly, not through bpmn-js |
| AntV X6 | 3.1.8 (npm latest); v2 read from branch `v2` | [antvis/X6](https://github.com/antvis/X6), branches `master` and `v2`, no SHA | [plugins](https://x6.antv.antgroup.com/en/tutorial/plugins/selection), [migration](https://x6.antv.antgroup.com/en/tutorial/update) | `x6.antv.vision` still returns 200 but serves the **v1** site and must not be cited for v2/v3. The plugin authoring interface is undocumented in every version, so it was read from source only |
| AntV G6 | 5.1.1 | [antvis/G6](https://github.com/antvis/G6), branch `v5`, **commit `7b7ff8e2b52609486840963dc1608d9f565e7f66`** (2026-07-15) | [plugin overview](https://g6.antv.antgroup.com/en/manual/plugin/overview) | The only pinned commit in this table. v4 read from published artifacts `@antv/g6-pc@0.8.25` and `@antv/g6-plugin@0.8.25` via unpkg, because the v4 doc sites are dead (`g6-v4.antv.antgroup.com` does not resolve, `g6-v4.antv.vision` returns 404) and the repo has no `v4` branch |
| LogicFlow | `@logicflow/core` 2.2.5, `@logicflow/extension` 2.3.1 | [didi/LogicFlow](https://github.com/didi/LogicFlow), branch `master` (pushed 2026-07-30), no SHA | repo markdown under `sites/docs/docs/tutorial/extension/` | `docs.logic-flow.cn` is a hash-routed SPA returning only a nav shell, so the upstream markdown was used. The current site appears to be `site.logic-flow.cn` per the `homepage` field. 1.x facts come from the `@logicflow/core@1.2.28` tag |
| Chart.js | 4.5.1 | [chartjs/Chart.js](https://github.com/chartjs/Chart.js), no SHA | [plugin docs](https://www.chartjs.org/docs/latest/developers/plugins.html), [hook reference](https://www.chartjs.org/docs/latest/api/interfaces/Plugin.html) | Plugin call ordering is undocumented upstream and was read off the implementation |
| CodeMirror | `@codemirror/state` 6.7.1, `@codemirror/view` 6.43.8 | [codemirror/state](https://github.com/codemirror/state), [codemirror/view](https://github.com/codemirror/view), branch `main`, no SHA | [guide](https://codemirror.net/docs/guide/), [config example](https://codemirror.net/examples/config/), [bundle example](https://codemirror.net/examples/bundle/) | GitHub `main` lags npm (state 6.6.0, view 6.41.0 there); API shapes were re-confirmed against the published `.d.ts` |
| ProseMirror | `prosemirror-state` 1.4.4, `prosemirror-view` 1.4x | [ProseMirror/prosemirror-state](https://github.com/ProseMirror/prosemirror-state), branch `master`, no SHA | none used; all claims from source | `prosemirror-view` minor version not pinned exactly |
| Tiptap | `@tiptap/core` 3.30.1, `@tiptap/extensions` 3.30.1 | [ueberdosis/tiptap](https://github.com/ueberdosis/tiptap), branch `main`, no SHA | [docs repo](https://github.com/ueberdosis/tiptap-docs), `extension.mdx`; rendered at [tiptap.dev](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension) | The rendered page could not be read verbatim, so the docs repo was used; repo `main` is assumed to match the live site |
| xterm.js | 5.5.0 (mechanism byte-identical on 6.0.0 `master`) | [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js), **tag `5.5.0`** | [using addons](https://xtermjs.org/docs/guides/using-addons/) | That doc page calls `loadAddon` a static method; it is an instance method |
| Cytoscape.js | 3.34.1 | [cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js), **tag `v3.34.1`** | [architecture](https://js.cytoscape.org/#introduction/architecture) | |
| GrapesJS | core 0.23.5 | [GrapesJS/grapesjs](https://github.com/GrapesJS/grapesjs), branch `dev`, no SHA | [plugins](https://grapesjs.com/docs/modules/Plugins.html), [source](https://github.com/GrapesJS/grapesjs/blob/dev/docs/modules/Plugins.md) | Read from `dev`, **not** from a published tarball, so the released behavior may differ |
| PrismJS | 1.30.0 | [PrismJS/prism](https://github.com/PrismJS/prism), branch `master`, no SHA | [extending](https://prismjs.com/extending.html#writing-plugins), [plugins](https://prismjs.com/#plugins) | A `v2` branch exists but is unpublished (`@prismjs/core` is 404 on npm) and was not audited. No TypeScript types ship with the package |
| ECharts | 5.5.1 (tag and published `lib/`); `master` = 6.1.0 | [apache/echarts](https://github.com/apache/echarts), **tag `5.5.1`** and branch `master` | [handbook](https://echarts.apache.org/handbook/en/basics/import/), doc source [apache/echarts-doc](https://github.com/apache/echarts-doc) and [apache/echarts-handbook](https://github.com/apache/echarts-handbook) | `echarts.apache.org/en/api.html` is a client-rendered SPA that returns only nav chrome, so the upstream `echarts-doc` markdown that generates it was used. `ComposeOption` findings are original measurements with echarts 5.5.1 and TypeScript 5.5.4, `--strict`, and they contradict the handbook |
| Shopify draggable | 1.2.1 | [Shopify/draggable](https://github.com/Shopify/draggable), branch `main`, no SHA | per-plugin READMEs in the repo, e.g. [SwapAnimation](https://github.com/Shopify/draggable/blob/main/src/Plugins/SwapAnimation/README.md) | `main` version matches npm `latest`, but the published tarball was not diffed against the branch |
| countUp.js | 2.10.1 | [inorganik/countUp.js](https://github.com/inorganik/countUp.js), branch `master`, no SHA | repo `README.md` | Plugins exist since 2.6.0. The only known plugin, [odometer_countup.js](https://github.com/msoler75/odometer_countup.js), was **not** inspected |
| FormKit auto-animate | 0.10.0 | [formkit/auto-animate](https://github.com/formkit/auto-animate), branch `master`, no SHA | [plugins](https://auto-animate.formkit.com/#plugins) | The docs page could not be read verbatim; claims come from source plus the repo's own example under `docs/src/examples/plugin/`. Repo root `package.json` is `private`, so published metadata was read from npm directly |
| bpmn-visualization | 0.48.0 (peer dependency of this package) | [process-analytics/bpmn-visualization-js](https://github.com/process-analytics/bpmn-visualization-js), read from `node_modules` (published build, `dist/bpmn-visualization.d.ts` and `dist/bpmn-visualization.js`), not from the repository | [bpmn-visualization-js docs](https://process-analytics.github.io/bpmn-visualization-js/) | Read only to establish the host API surface and the mxGraph substrate. No commit or tag applies, since the published artifact was used |

### Reference commits, captured 14 August 2026

Since almost everything above was read from a moving branch, these are the head commits of those same branches on the
last day of the analysis. **They are a nearby reference point, not a record of what was read**: a branch may have
advanced between the reading and this capture. The G6 and maxGraph rows are the actual commits analysed. Rows whose
head predates
the analysis (mxGraph, PrismJS, draggable, Chart.js, CodeMirror, ProseMirror, didi, countUp.js, auto-animate, ECharts)
had no activity in between, so for those the capture and the reading coincide.

| Repository | Branch | Head commit on 2026-08-14 | Committed |
|---|---|---|---|
| maxGraph/maxGraph | `main` | `34a0d3c7ac9b1cd9f6b6b31e40ec5c1d18d01b4d` (**the commit analysed**) | 2026-08-12 |
| jgraph/mxgraph | `master` | `ff141aab158417bd866e2dfebd06c61d40773cd2` | 2020-11-13 |
| bpmn-io/bpmn-js | `develop` | `ff1974f264421f9461f4c1abaca93469aecc2ff6` | 2026-08-11 |
| bpmn-io/diagram-js | `develop` | `c36559ee6240ce25750263bbb77bdbc1b9dc2fc5` | 2026-08-11 |
| nikku/didi | `main` | `e59ec9a0a1d047b76840a417ad59da6144cdabd6` | 2026-07-12 |
| antvis/X6 | `master` | `b14ca27540693c610257e7687c663f122deb0006` | 2026-08-11 |
| antvis/G6 | `v5` | `7b7ff8e2b52609486840963dc1608d9f565e7f66` (**the commit analysed**) | 2026-07-15 |
| didi/LogicFlow | `master` | `698019f1ef6dd322afbbb0b4e82b9d31e198adac` | 2026-07-30 |
| chartjs/Chart.js | `master` | `cb02e1d207bd4c4c40b20c259017f85f26f1e30a` | 2026-05-27 |
| codemirror/state | `main` | `9c801279cb83011e6f92af778f4443406e8f1200` | 2026-04-15 |
| codemirror/view | `main` | `fbff59ba004d80d8c914f64c42586387b08706ac` | 2026-04-15 |
| ProseMirror/prosemirror-state | `master` | `ffad5d9450a0b93438be53a801deee1a223a81bf` | 2026-04-01 |
| ueberdosis/tiptap | `main` | `80cdaa25c7b1c769a370e6f97dd0085dcf9e63a9` | 2026-08-13 |
| xtermjs/xterm.js | `master` | `29a738423349b75d40732f4cd12a5a0326e03fed` | 2026-08-10 |
| cytoscape/cytoscape.js | `master` | `251014131815af43b948ae3cdf2f2d994d3f3a36` | 2026-08-11 |
| GrapesJS/grapesjs | `dev` | `ad4b5c1e361b2280397236aab006cd3002b5f524` | 2026-08-11 |
| PrismJS/prism | `master` | `298b75f1764c4abfe76d997394b7b149845f685a` | 2025-05-21 |
| apache/echarts | `master` | `30076aedcd7b7f65d8dd8e8d9ece46ce778133a3` | 2026-08-04 |
| Shopify/draggable | `main` | `8a1eed57f3ab2dff9371e8ce60fb39ac85871e8d` | 2025-10-22 |
| inorganik/countUp.js | `master` | `2346e4994f870fdc9028944b3d79dc80af3b33d2` | 2026-07-02 |
| formkit/auto-animate | `master` | `06882a8e69ba9bc8456d8f2ae6010f697fd7a37c` | 2026-07-10 |

Note that xterm.js, Cytoscape and ECharts were read at version tags (`5.5.0`, `v3.34.1`, `5.5.1`) rather than at these
branch heads, so for them the tag is authoritative and the row above is only context.

## A. Retrieve by string id, and pay for it

### maxGraph 0.24 (`@maxgraph/core`)

The design this package was based on. Classes at construction, retrieval by id, one lifecycle hook.

```ts
export type PluginId = BuiltinPluginId | (string & Record<never, never>);
export interface GraphPluginConstructor { pluginId: PluginId; new (graph: AbstractGraph): GraphPlugin; }
export interface GraphPlugin { onDestroy: () => void; }
```

```ts
// AbstractGraph.ts
private plugins = new Map<string, GraphPlugin>();
options?.plugins?.forEach((p) => this.plugins.set(p.pluginId, new p(this)));
getPlugin = <T extends GraphPlugin>(id: PluginId): T | undefined => this.plugins.get(id) as T;
```

Notable: duplicate `pluginId` **overwrites silently** (`Map.set` is unconditional); the docs only warn in prose that
two plugins handling the same functionality "leads to non-deterministic behavior". Plugins receive only the graph,
with no options object and no configure hook. Cross-plugin dependency is lazy and by convention:
`PopupMenuHandler` and `SelectionHandler` call `this.graph.getPlugin<X>('X')` at use time and tolerate `undefined`.
The docs' own custom-plugin example omits the required `onDestroy`.

What it teaches: this package already improved on it (five hooks against one, fail-fast duplicates, an options
channel). The remaining shared defect is the cast, and it is the natural thing to fix jointly.

### bpmn-js 18 / diagram-js 15 / didi 11

```js
export default {
  __depends__: [ DrawModule ],
  __init__: [ 'canvas' ],
  canvas: [ 'type', Canvas ],
  eventBus: [ 'type', EventBus ]
};
```

```js
function InteractionLogger(eventBus) { eventBus.on('element.hover', e => console.log()) }
InteractionLogger.$inject = [ 'eventBus' ];
var extensionModule = { __init__: [ 'interactionLogger' ], interactionLogger: [ 'type', InteractionLogger ] };
var bpmnModeler = new Modeler({ additionalModules: [ extensionModule ] });
```

Retrieval is `viewer.get<ElementRegistry>('elementRegistry')`, a manual cast, and that is the documented pattern.
`Diagram<ServiceMap>` exists as a type parameter but ships unpopulated, so the last overload `get<T>(name: string): T`
swallows anything: a compiled probe returned `unknown` for a nonexistent service with `tsc` exiting 0.

`__depends__` holds **module object references**, deduplicated by identity, resolved depth-first, so ordering is
deterministic. A missing dependency throws only if the service is eagerly instantiated via `__init__`; otherwise it
surfaces on first `get`. The event bus supports priority, `stopPropagation`, `preventDefault` and return-value
interception, which is what makes rules and behaviors composable.

Teardown is shallow: `destroy()` fires `diagram.destroy` and each service cleans itself up by convention. The injector
is never torn down, and its instance cache is never cleared.

What it teaches: dependency declaration by identity, and an event bus worth copying if one is ever added here.

### AntV X6 3.1

```ts
use(plugin: GraphPlugin, ...options: any[]) {
  if (!this.installedPlugins.has(plugin)) {
    this.installedPlugins.add(plugin)
    plugin.init(this, ...options)
  }
  return this
}

getPlugin<T extends GraphPlugin>(pluginName: string): T | undefined {
  return Array.from(this.installedPlugins).find((plugin) => plugin.name === pluginName) as T
}
```

```ts
graph.use(new Snapline({ enabled: true }))
graph.use(new Scroller({ enabled: true, pannable: true }))
```

Loading takes a live instance, so the premise about a registry does not apply. Deduplication is by object identity,
not by name, so two instances sharing a name both install. The plugin contract is
`{ name, init, dispose, enable?, disable?, isEnabled? }`.

Transparency comes from a per-plugin `api.ts` that both augments the `Graph` interface and patches `Graph.prototype`:

```ts
declare module '../../graph/graph' {
  interface Graph { select: (...) => Graph; getSelectedCells: () => Cell[] }
}
Graph.prototype.select = function (cells, options) {
  const selection = this.getPlugin('selection') as Selection
  if (selection) { selection.select(cells, options) }
  return this
}
```

Note the `if (selection)`: calling `graph.select()` without the plugin is a **silent no-op**. `installedPlugins` is
not cleared by `dispose()`. The plugin interface has never been documented in any version.

What it teaches: both the appeal of host augmentation and its two costs, silent no-ops and page-global patching.

### AntV G6 v5

```ts
export function register<T extends ExtensionCategory>(category, type: string, Ctor) {
  const ext = EXTENSION_REGISTRY[category][type];
  if (ext) { print.warn(`The extension ${type} of ${category} has been registered before, and will be overridden.`); }
  Object.assign(EXTENSION_REGISTRY[category]!, { [type]: Ctor });
}
```

```ts
register(ExtensionCategory.PLUGIN, 'my-custom-plugin', MyCustomPlugin);
const graph = new Graph({ plugins: ['my-custom-plugin', { type: 'tooltip', key: 'my-tooltip' }] });
graph.getPluginInstance<Tooltip>('my-tooltip');
```

The consumer passes a string id or a `{ type, key }` object, never a class or instance. `getPluginInstance` is
`as unknown as T` over a `T extends BasePlugin<any>` bound that constrains nothing. An unknown key warns and falls
back to a type lookup, then returns `undefined`. The `type` field is a bare `string`; G6's own test asserts
`{ type: 'unset' }` compiles. A missing registration is a `console.warn` and a silently skipped plugin.

The plugin base class is three members after inheritance: `constructor(context, options)`, `update(options)`,
`destroy()`. There is no `init`. Plugins bind listeners in the constructor and unbind in `update`/`destroy`.

What it teaches: the registry design in its fullest form, and the evidence that it buys neither tree-shaking nor type
safety.

### LogicFlow 2.x (`@logicflow/core` 2.2.5, `@logicflow/extension` 2.3.1)

```ts
static use(extension: ExtensionConstructor | ExtensionDefinition, props?): void {
  const { pluginName } = extension
  if (!pluginName) { throw new Error(`请给插件指定 pluginName!`) }
  this.extensions.set(pluginName, { [pluginFlag]: pluginFlag, extension, props })
}
```

```tsx
LogicFlow.use(Control)                                    // global: stores the class, never instantiates
const lf = new LogicFlow({ container, plugins: [DndPanel, SelectionSelect] })   // per instance
```

```ts
class Highlight {
  static pluginName = 'highlight'
  constructor({ lf, options }) { this.lf = lf }
  render() { this.lf.on('node:mouseenter', ({ data }) => this.highlight(data.id)) }
  destroy() {}
}
```

Retrieval is `lf.extension.<pluginName>`, typed `Record<string, Extension | ExtensionDefinition>` where `Extension`
has only `render` and `destroy?`. The documented call `lf.extension.contextPad.setContextMenuItems([...])` therefore
**does not typecheck**. The class also declares `[propName: string]: any`, sanctioning plugins that monkey-patch
methods onto `lf` (the Snapshot plugin adds `lf.getSnapshot`), and incidentally making every typo compile.

Three consumer idioms coexist for the same mechanism: go through `lf.extension.x`, call a patched `lf.x()`, or use a
plugin that works by pure side effect (`BpmnElement` registering element types). Which applies is knowable only from
each plugin's docs.

What it teaches: the global-registration-plus-per-instance-construction layering is genuinely valuable and separable
from everything else. The retrieval story is a warning.

### Chart.js 4

```ts
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    customCanvasBackgroundColor?: { color?: string }
  }
}
```

Plugins are objects with an `id`, registered globally with `Chart.register()` or per chart in `config.plugins[]`, and
configured under `options.plugins.<id>`. Roughly 35 hooks, dispatched via `chart.notifyPlugins(hook, args)`, with
`before*` hooks cancelling by returning `false`.

Retrieval exists but is vestigial: `Chart.registry.getPlugin(id)` returns the shared singleton typed as a bare
`Plugin` and throws on miss. Consumers are not meant to call it, because a Chart.js plugin is configured, never
invoked. The plugin object is a singleton shared by every chart; built-ins stamp `chart.legend` / `chart.tooltip` and
`delete` it in `stop`, with no supported per-chart state store.

What it teaches: declaration merging welding an id string to a type across a seam a cast would leave unchecked. This is
the direct ancestor of alternative A.

## B. Retrieval solved

### ProseMirror 1

```ts
export class PluginKey<PluginState = any> {
  key: string
  constructor(name = "key") { this.key = createKey(name) }
  get(state: EditorState): Plugin<PluginState> | undefined { return state.config.pluginsByKey[this.key] }
  getState(state: EditorState): PluginState | undefined { return (state as any)[this.key] }
}
```

The lookup string is generated and disambiguated (`"history$"`, `"history$1"`), so two packages both wanting "history"
cannot shadow each other and a consumer cannot forge a key. Adding a second instance of a keyed plugin throws
`RangeError`. Because `historyKey` is not exported, third-party code cannot reach `HistoryState` at all, only
`undoDepth(state)`.

Two typing holes worth knowing before copying: `PluginSpec.key?: PluginKey` is not generic, so nothing checks the
key's `T` against the plugin's actual state type, and `PluginSpec` has `[key: string]: any`, which disables
excess-property checking.

What it teaches: identity as capability. The type rides on the token, so there is one assertion at declaration time
instead of one cast per call site.

### CodeMirror 6

```ts
export type Extension = {extension: Extension} | readonly Extension[]
```

Extensions are plain values, arbitrarily nested, deduplicated by object identity, with `Facet.define({enables})` and
`StateField.define({provide})` pulling dependencies into the configuration automatically. Ordering is five `Prec`
buckets then array position. Retrieval is `state.facet(f)`, `state.field(f)`, `view.plugin(p)`, all typed with no cast,
and handles can stay module-private.

A crashing plugin is logged, destroyed and deactivated, explicitly so it cannot take down the view. Reconfiguration
destroys removed plugins automatically.

What it teaches: dependency declaration that works by pulling the dependency in rather than validating that the
consumer supplied it, plus the only error-isolation policy in the survey.

### Tiptap 3

```ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    undoRedo: {
      /** Undo recent changes @example editor.commands.undo() */
      undo: () => ReturnType
      redo: () => ReturnType
    }
  }
}
```

```ts
const editor = new Editor({ extensions: [CustomExtension] })
editor.commands.customCommand()
editor.chain().customCommand().run()
```

`Extension.create()` is a factory returning an instance; `configure()` and `extend()` return new instances linked by a
parent chain rather than mutating. The type machinery flattens the group key away with `UnionToIntersection` and
re-instantiates `ReturnType` three times, which is why one declaration yields `commands`, `chain()` and `can()`.

Unsound in three ways: nothing checks that a declared command is implemented (declare `undo`, skip `addCommands()`,
and the call compiles and throws), the runtime merge is a flat spread so same-named commands silently overwrite, and
the augmentation applies from a package being in the dependency graph rather than from the extension being loaded.
Duplicate extension names only `console.warn`, and both copies stay wired.

Storage is the sound counterpart: `interface Storage {}` has **no index signature**, so `editor.storage.characterCount`
is a compile error unless the extension ships its own augmentation.

What it teaches: both halves of alternative F. The commands surface shows the ergonomics, the storage surface shows how
to get them without an index signature swallowing mistakes.

### xterm.js 5/6

```ts
loadAddon(addon: ITerminalAddon): void;
export interface ITerminalAddon extends IDisposable { activate(terminal: Terminal): void; }
```

```ts
public loadAddon(terminal: Terminal, instance: ITerminalAddon): void {
  const loadedAddon = { instance, dispose: instance.dispose, isDisposed: false };
  this._addons.push(loadedAddon);
  instance.dispose = () => this._wrappedAddonDispose(loadedAddon);
  instance.activate(terminal as any);
}
```

There is no `getAddon`. The consumer already holds `const fitAddon = new FitAddon()` with its exact type, so retrieval
and typing are free because they never happen. Options are ordinary constructor arguments. Every extension point the
host offers returns an `IDisposable`, which is why `dispose()` is usually a one-line fan-out.

Caveat found in source: `FitAddon` and `WebglAddon` both reach into `(terminal as any)._core` with a
`// TODO: Remove reliance on private API`, so the public extension surface is not sufficient even for first-party
addons.

What it teaches: alternative B in its purest form, including the honest cost that the host can never ask whether an
addon is present.

### countUp.js 2.10

```ts
export declare interface CountUpPlugin { render(elem: HTMLElement, formatted: string): void; }
```

```js
const countUp = new CountUp('targetId', 5234, {
  plugin: new Odometer({ duration: 2.3, lastDigitDelay: 0 }),
  duration: 3.0
});
```

One plugin slot, singular, no array and no composition. No registry, no id, no retrieval. The plugin's options are
typed by its own constructor at the consumer's call site, and the core `CountUpOptions` interface contains zero
knowledge of any plugin's option shape. No teardown exists at all.

What it teaches: the cleanest demonstration that instance-passing decouples plugin options from the core's type
surface, and the clearest example of what is lost without a lifecycle.

## C. No retrieval at all

### Shopify draggable 1.2

```js
const sortable = new Sortable(document.querySelectorAll('ul'), {
  draggable: 'li',
  swapAnimation: { duration: 200, easingFunction: 'ease-in-out', horizontal: true },
  plugins: [Plugins.SwapAnimation],
});
```

```ts
export abstract class AbstractPlugin {
  constructor(protected draggable: FixMeAny) {}
  attach() { throw new Error('Not Implemented'); }
  detach() { throw new Error('Not Implemented'); }
}
```

Classes at construction, the library instantiates. `removePlugin(SwapAnimation)` identifies by constructor reference,
so add, remove and `exclude.plugins` are all statically checked with no string and no cast. Zero hits for
`getPlugin`, `pluginId` or `registerPlugin` across all 76 source files.

The cost is visible in the typings: because there is no handle on the plugin, per-plugin options must live on the core
interface, so `swapAnimation?: SwapAnimationOptions` sits in draggable's own `index.d.ts`. A third-party plugin has no
typed home for its options. Documented constraints are unenforced: "The swap animation plugin currently only works
with `Sortable`", yet `plugins` is declared on the base options so the wrong combination type-checks and silently does
nothing.

What it teaches: the id is a consequence of retrieval. Remove the need to retrieve and the id, the collision namespace
and the cast all disappear together.

### GrapesJS 0.23

```js
const editor = grapesjs.init({ container: '#gjs', plugins: [myPlugin] });
```

```js
function myPlugin(editor) {
  editor.Blocks.add('my-first-block', { label: 'Simple block', content: '<div>...</div>' });
}
```

A plugin is a plain function. If it returns an object, `add()` **silently discards it**; only a returned function is
kept, as a cleanup handler. `editor.Plugins.get(id)` returns a bookkeeping model, so a plugin API for the consumer is
structurally impossible. String ids resolve through the `window` global, which a bundler cannot see.

Teardown is unusually thorough for registrations made during plugin execution (blocks, keymaps, component types,
devices, style sectors are recorded and replayed in reverse), but `PluginManager.destroy()` never invokes the stored
cleanups: they run only on explicit `Plugins.remove()`.

What it teaches: option typing by inference at the registration site, needing no registry and no merging.

### PrismJS 1.30

```js
Prism.hooks.add('wrap', function(env) {
  if (env.type === 'entity') { env.attributes['title'] = env.content.replace(/&amp;/, '&'); }
});
```

```js
if (!Prism.plugins.toolbar) {
  console.warn('Show Languages plugin loaded before Toolbar plugin.');
  return;
}
```

The extension point is the **hook**, not the plugin object, so N plugins compose at the same point in registration
order and the host needs no knowledge of any of them. Loading is a side-effectful script include; there is no
per-instance concept at all, and two independently configured setups cannot coexist on a page. `hooks` has `add` and
`run` but no `remove`. Hook names are unchecked strings. Plugin dependencies exist only in build metadata
(`components.json`), enforced by hand-written guards like the one above.

The official docs example for writing a plugin is **wrong against the source**: it tests `env.token === 'entity'`, but
the `wrap` env carries `type` and never `token`, so the condition is always false. The snippet above is the corrected
form.

What it teaches: hook-based extension at its most flexible and least safe, which is the shape of the trade-off behind
the event-bus question.

### ECharts 5/6

```js
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, TitleComponent, TooltipComponent, GridComponent, CanvasRenderer]);
```

```ts
type ECOption = ComposeOption<
  BarSeriesOption | LineSeriesOption | TitleComponentOption | TooltipComponentOption
>;
```

```ts
export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerComponentModel(TitleModel);
    registers.registerComponentView(TitleView);
}
```

`use()` takes an **installer function** or an object with `install`, never a class or an instance, and is global rather
than per chart. There is no retrieval API: the feature is reached declaratively through `setOption`. Tree-shaking is
the documented motivation, and it works because the bundler sees values, not because anything is named by string.

Forgetting `use()` produces a development-only `console.error` and, in production, complete silence: the component
simply never renders. `ComposeOption` catches wrong series subtypes and wrong values but not missing components, for
the index-signature reason described in 5.A.

What it teaches: real tree-shaking comes from passing values, and a permanent global registry with no `unuse` is the
price.

### Cytoscape 3

```js
cytoscape.use = function( ext ){
  let args = Array.prototype.slice.call( arguments, 1 );
  args.unshift( cytoscape );
  ext.apply( null, args );
  return this;
};
```

Registration is global and retroactive, mutating `Core.prototype` and `Collection.prototype`, so `cy.edgehandles()`
reads exactly like `cy.fit()`. There is no per-instance opt-out. Collision semantics are inconsistent by type: core
and collection extensions are first-wins with a suppressible warning, layouts and renderers are silent last-wins. The
recommended setup pattern is an import side effect, and there is no `sideEffects` field. There is no unregister at
all, and `cy.destroy()` does not notify extensions.

What it teaches: maximum call-site transparency, and the full bill for it.

### FormKit auto-animate 0.10

```ts
export default function autoAnimate(
  el: HTMLElement,
  config: Partial<AutoAnimateOptions> | AutoAnimationPlugin = {},
): AnimationController
```

Not a plugin system. What the docs call a plugin is the second positional argument, discriminated by
`typeof === "function"`, one per element, mutually exclusive with the options object. No registry, no id, no ordering,
no lifecycle. Passing a plugin means `duration`, `easing` and `disrespectUserMotionPreference` are all ignored,
**including the reduced-motion check**, which is an accessibility regression with no warning.

What it teaches: the correct amount of machinery for a problem with one extension point. Included as the honest lower
bound, since a registry here would be pure overhead.

---

# Appendix B: relation to the earlier DeepWiki analysis

An earlier pass over the same question was run on **2026-05-06 with DeepWiki** (fast mode) against
`process-analytics/bpmn-visualization-addons`. Its full output is kept alongside this document, at
[`analyze_plugin_system_by_deepwiki_20260506.md`](./analyze_plugin_system_by_deepwiki_20260506.md), so the comparison
below can be checked rather than taken on trust. It is worth recording, both because it corroborates part of this
document independently and because where it diverges is instructive.

Note that it analysed the code as of May 2026, several releases before commit `94519a2`, so some of its statements are
about a version of the plugin system that no longer exists. Its citations are consequently to different line numbers
than the ones used throughout this document.

**Independently corroborated**, three months before this analysis and by a different tool: no dependency system, no
dynamic loading or unloading, no plugin metadata or registry, no error isolation, no configuration validation, no
inter-plugin communication. Six of the gaps in section 3.

**Imported into this document from that pass**, having been missed here:

- eager construction of every plugin at startup (section 3);
- the tracked `StyleByNamePlugin` caching issue (section 2.3), which sits in the same code where this analysis found
  the substring defect and which this analysis had reduced to a passing mention;
- a metadata descriptor carrying version, dependencies and capabilities as a single home for three separate gaps
  (section 3).

**Where it is wrong, and why the error is worth keeping on record.** It lists as a strength: *"Type Safety: Strong
TypeScript support with generic `getPlugin<T>()` method for type-safe plugin retrieval"*, citing the very lines whose
body is `return this.plugins.get(id) as T;`. An unchecked cast returning a value typed as non-nullable is presented as
type safety, with the disproving code quoted directly beneath the claim. That is the central defect this document is
built around, and it was inverted into a selling point. A second, milder overstatement: *"Comprehensive Testing:
Well-covered test suite"*, against a suite with no coverage of hook ordering, double `dispose()`, a throwing hook,
`load()` after `dispose()`, the substring match, or options validation, and a `check-ts-support` package that never
exercises the plugin API at all (section 2.3).

The generalizable lesson is the one already applied throughout this document: a claim about typing must be compiled,
not read. Both analyses looked at the same six lines; only the compiled one got the answer right.

**Where it is simply out of date**, which reflects well on the project rather than badly on the tool. It reports "No
Lifecycle Hooks: Missing hooks for before/after load, unload, or configuration events". Those shipped in 0.10.0 as
`onBeforeLoad`, `onLoadSuccess`, `onLoadError` and `onDispose`. It also quotes `configure?`, renamed to `onConfigure`
since. Any reader comparing the two documents should date-check before treating a divergence as a disagreement.
