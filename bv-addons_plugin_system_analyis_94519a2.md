# Plugin system analysis: `@process-analytics/bpmn-visualization-addons`

Commit `94519a2`, package version 0.10.0, peer `bpmn-visualization >=0.48.0`.
Every claim is cited to `file:line` in this repo, or to a primary source for a third-party library. Seventeen
browser-side extension mechanisms were examined; the per-library detail is in the appendix.

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
| Add or remove after construction | Impossible | X6 `disposePlugins`, G6 `setPlugins`, CodeMirror `Compartment`, ProseMirror `reconfigure`, draggable `addPlugin`/`removePlugin` |
| Enable or disable without unloading | Impossible | X6 `enablePlugins`, Chart.js `options.plugins.<id> = false`, LogicFlow `disabledPlugins` |
| Declaring a plugin set once for the whole app | Impossible; every call site repeats the list | LogicFlow: `LogicFlow.use(X)` registers the class globally, each instance constructs its own copy, and `plugins` plus `disabledPlugins` override per instance. This layering is genuinely more capable than a constructor-only list, and is orthogonal to every other axis here |
| Version compatibility | Nothing links a plugin to a core version | X6 v2 used per-plugin peer dependencies |

## 4. Comparison

Columns trimmed to the axes that discriminate. "Cast" means the consumer must assert a type the compiler cannot check.
Build-time Node tools (Vite, Rollup, ESLint) are excluded: their loading model resolves plugins by package name at
runtime, which a browser library cannot do. One idea from them transfers, noted in 5.C.

| | Load by | Retrieve by | Cast | Deps | Global state | Feature reads as native |
|---|---|---|---|---|---|---|
| **addons (today)** | class | string id | yes | no | none | no |
| maxGraph 0.24 | class | string id | yes | no | none | no |
| bpmn-js 18 | module map | string id | yes | `__depends__` | none | no |
| X6 3.1 | instance | string id (undocumented) | yes | no | prototype patching, CSS | yes |
| G6 v5 | **string id** | `getPluginInstance(key)` | yes, double | no | global registry | partly |
| LogicFlow 2.x | class, global or per instance | `lf.extension.<name>` | **worse than a cast** | no | static registry | inconsistent, three idioms |
| Chart.js 4 | object with an id | id, rarely needed | no | no | registry singleton | yes, via options |
| CodeMirror 6 | value | typed handle | **no** | `enables` | none | mostly |
| ProseMirror 1 | instance | typed `PluginKey<T>` | **no** | no | none | yes, via exported functions |
| Tiptap 3 | factory result | **nothing to retrieve** | **no** | no | type augmentation is global | **yes** |
| xterm.js 5/6 | instance | **nothing to retrieve** | **no** | no | none | no, deliberately |
| countUp.js 2 | instance, single slot | **nothing to retrieve** | **no** | no | none | no |
| GrapesJS 0.23 | function | bookkeeping model only | n/a | no | none | yes |
| PrismJS 1.30 | side-effect import | `Prism.plugins.X` by convention | untyped | build metadata only | **everything** | yes |
| ECharts 5/6 | installer function | **nothing to retrieve** | **no** | runtime topological | permanent global registry | yes, via options |
| draggable 1.2 | class | **nothing to retrieve** | **no** | no | none | n/a, no API |
| Cytoscape 3 | global `use()` | prototype method | n/a | no | heavy | yes |
| auto-animate 0.10 | callback, single slot | **nothing to retrieve** | **no** | no | observers created at import | n/a, no API |

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

```ts
export interface PluginRegistry {
  overlays: OverlaysPlugin;
  style: StylePlugin;
  // third parties add their own by module augmentation
}

getPlugin<K extends keyof PluginRegistry>(id: K): PluginRegistry[K] | undefined;
getPlugin<T extends Plugin>(id: string): T | undefined;
```

```ts
// before
const overlaysPlugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
// after: no type argument, correct type, mismatch impossible
const overlays = bpmnVisualization.getPlugin('overlays');
```

Chart.js's mechanism applied to retrieval, and what bpmn-js's `Diagram<ServiceMap>` type parameter tries to do but
never populates. Tiptap's `interface Storage {}` is the same trick on a property.

**One implementation warning, learned from ECharts.** Its `ComposeOption` pattern was compiled empirically with
TypeScript 5.5 in strict mode: it catches wrong series subtypes and wrong values, but does **not** catch options for a
component that was never registered, nor invented keys, because an index signature on `ECUnitOption` swallows unknown
keys as `unknown`. `PluginIds` at `plugins-support.ts:120` has exactly that widening shape. The typed overload must
key on `keyof PluginRegistry` alone, with the widened form confined to the loose overload, or A silently degrades into
the status quo.

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

The Tiptap `storage` model, and the version of C that survives:

```ts
export interface BpmnFeatures {}                       // core declares it empty, no index signature
declare module '...' { interface BpmnFeatures { overlays: OverlaysPlugin } }   // each plugin augments

bpmnVisualization.features.overlays.addOverlays(id, overlay);
```

No cast, no string at the call site, no prototype patching, and plugins stay out of the core's type surface.
Crucially, **no index signature**, so an un-augmented key is a compile error rather than `any`, which is exactly where
LogicFlow's `Record<string, ...>` fails.

Its residual unsoundness is shared with A, C and Tiptap alike: the type says the feature exists, the runtime decides
whether it was loaded. Tiptap's failure mode is instructive, since the augmentation applies merely because a package
is in the dependency graph, whether or not the extension was passed to the editor.

### Comparison

| | Ergonomics | Type safety | Tree-shaking | Author cost | Semver | Migration |
|---|---|---|---|---|---|---|
| A. Declaration merging | unchanged | **fixed** | unchanged | one interface augmentation | **additive** | none |
| B. Instance loading | **much better** | **fixed** | unchanged | `init(bv)` instead of ctor arg | breaking | mechanical, one line per registration |
| C. Host augmentation | best | good | **worse** | augmentation plus prototype patching | breaking, permanently widens the API | large |
| D. Typed token | better | **fixed** | unchanged | export a token | breaking | moderate, new concept |
| E. Global registry | symmetric only | **not fixed** | **no gain** | a `register` call | breaking | large, adds global state |
| F. Namespaced accessor | **much better** | **fixed** | unchanged | one interface augmentation | additive if added beside `getPlugin` | none, opt-in |

## 6. Recommendation

**Ship A and F together now, plan B for the next major, reject C and E, keep D in reserve.**

A and F are the same mechanism pointed at two targets, cost one interface each, and are additive. A fixes the existing
call sites without touching them; F gives new code a call site with no cast and no string at all, and can be added
beside `getPlugin` rather than replacing it. Pair them with the honest return type `T | undefined`, which is
technically breaking for `strict` consumers but converts a runtime crash into a compile error, and with
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
- Whether `OverlaysPlugin` tolerates a missing container (`plugins/overlays.ts:27`).
- Whether the non-nullable `getPlugin` return type is deliberate or an oversight.
- Chart.js plugin call ordering and G6 plugin DOM ordering are undocumented upstream and were read off the
  implementation, so neither is a contract.
- LogicFlow's global-plus-instance double installation is a source reading, not a runtime observation.
- The ECharts `ComposeOption` results in 5.A are the researcher's own `tsc` measurements, and they contradict the
  ECharts handbook's claim. Treat as reproducible measurement, not as documentation.
- ADR 0001 is still `status: draft` (`docs/adr/0001-plugin-support.md:2`), which `docs/README.md:13` defines as "not
  yet ready for review".
- `CLAUDE.md:60-67` lists only `getPluginId` and `onConfigure` under "Plugin Lifecycle", missing the four hooks added
  in 0.10.0.

## 9. Not covered here

Candidates for a follow-up, ranked by what would change a decision:

1. A compiled probe of alternatives A and F. Every third-party typing claim in this document was verified with `tsc`;
   the recommendation itself was not. The overload ordering in A is the specific risk: if the loose
   `getPlugin<T>(id: string)` overload is reachable first, the typed one never fires.
2. Making `BpmnVisualization` generic over the plugin tuple it was constructed with, so `features.overlays` is a
   compile error when `OverlaysPlugin` was not passed. No library in this survey does this, and it may not survive
   contact with real inference.
3. An audit of the five shipped plugins against the gap list in section 3.
4. The missing tests, enumerated: hook ordering across plugins, double `dispose()`, a throwing hook, `load()` after
   `dispose()`, the substring match, options validation.
5. A ready-to-paste ADR recording the maxGraph lineage, with the corrected ECharts attribution.

Deliberately excluded: bundle-size measurements (no alternative except E moves that axis), more libraries (seventeen
already produced three families; an eighteenth adds a row, not an insight), and effort estimates.

---

# Appendix: per-library detail

Grouped by the organizing question in the preamble. Versions are those verified at the time of research.

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
