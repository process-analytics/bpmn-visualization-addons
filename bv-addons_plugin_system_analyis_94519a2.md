# Plugin system analysis: `@process-analytics/bpmn-visualization-addons`

Commit `94519a2`, package version 0.10.0, peer `bpmn-visualization >=0.48.0`.
Every claim below is either cited to `file:line` in this repo or to a primary source for a third-party library.

## Verdict

The mechanism is small, correct in its core choices, and has the strictest collision handling of any comparable
library surveyed. Its weaknesses are concentrated in one place: **the boundary where a consumer gets hold of a
feature**. `getPlugin<T>(id)` is an unchecked cast returning a value typed as non-nullable that is actually
`undefined` when the id is unknown, and every feature call is preceded by a lookup that names the plugin class three
times. The asymmetry you asked about is real, but it is a symptom rather than the disease. The disease is that a
plugin cannot be constructed by the consumer, because it needs the `BpmnVisualization` reference that does not exist
yet, so the API is forced to take a constructor and hand back an identity later.

The two references you cited do not support the design you feared they would. Details in "Premise corrections".

## 1. Strengths

- **No global mutable state.** The plugin map is a per-instance field (`plugins-support.ts:123`), and a grep for
  module-level mutable bindings, `static` fields and shared registries across `packages/addons/src` finds none. Every
  plugin keeps its state on the instance. Several diagrams coexist on a page safely. Both X6 (`Graph.prototype`
  patching, module-global CSS loader) and Cytoscape (global registry, prototype mutation, register-once-applies-
  everywhere) are worse here, and this is the single most valuable property the current design has.
- **Fail-fast on duplicate ids** (`plugins-support.ts:155-157`), tested for three cases including subclassing
  (`test/spec/plugins-support.test.ts:75-106`). Of the six browser libraries surveyed, this matches only ProseMirror.
  maxGraph silently overwrites (`Map.set`), Cytoscape is inconsistent (first-wins with a suppressible warning for core
  extensions, silent last-wins for layouts), and X6 deduplicates by object identity so two instances sharing a name
  both install and retrieval returns whichever comes first.
- **The richest lifecycle of the class-based designs.** Five hooks (`onConfigure`, `onBeforeLoad`, `onLoadSuccess`,
  `onLoadError`, `onDispose`, `plugins-support.ts:43-95`) against maxGraph's single `onDestroy` and X6's
  `init`/`dispose` plus optional `enable`/`disable`. The two-phase construct-then-configure split
  (`plugins-support.ts:152-164`) is a real design decision: every plugin exists before any is configured, so a plugin
  can look up another during `onConfigure` without depending on array order. maxGraph has no equivalent and its
  plugins must defer cross-plugin lookups to call time.
- **Tree-shaking is not sabotaged.** No import side effects, no global registration call. Contrast X6 v3, where every
  plugin does `import './api'` which executes `Graph.prototype.select = ...` and ~30 siblings at import time, and
  `package.json` has no `sideEffects` field, so `import { Graph } from '@antv/x6'` structurally reaches all eleven
  plugins.
- **Hooks are documented for authors**, in the README (`packages/addons/README.md:77-82`, `:124-138`, `:161-188`) and
  in ADR 0001 (`docs/adr/0001-plugin-support.md:43-58`). X6 never documented its plugin interface in any version: an
  exhaustive grep of all 116 v3 and 178 v2 doc pages returns zero matches for `getPlugin` or any authoring term.

## 2. Weaknesses

### 2.1 The retrieval boundary (the core problem)

```ts
getPlugin<T extends Plugin>(id: PluginIds): T {
  return this.plugins.get(id) as T;
}
```
`plugins-support.ts:146-148`.

Three defects in two lines:

1. **The generic is an unchecked cast.** `T` is caller-supplied and never related to `id`.
   `getPlugin<StylePlugin>('overlays')` compiles and returns an `OverlaysPlugin` typed as `StylePlugin`. The failure
   is a `TypeError` at the first method call. Documented nowhere, and `getPlugin` carries no TSDoc at all.
2. **The return type lies.** It is declared non-nullable `T`, but an unknown id returns `undefined`, asserted by the
   suite itself (`test/spec/plugins-support.test.ts:13`). Under `strict: true` the consumer gets no narrowing prompt,
   so forgetting to list a plugin in `plugins:` produces "Cannot read properties of undefined" at the first feature
   call rather than a compile error.
3. **The id has no link to the implementation.** `DefaultPlugins` (`plugins-support.ts:115`) re-declares the five id
   literals as a type, duplicating the strings that live in each `getPluginId()` body
   (`plugins/css-classes.ts:35`, `elements.ts:44`, `overlays.ts:52`, `style.ts:37`, `style.ts:99`). Nothing keeps the
   two in sync, and there is no id-to-type map, so `T` can never be inferred.

Ceremony that follows from this: `packages/demo/src/overlays.ts` names the class in the import (`:20`), in `plugins:`
(`:30`), and again as the type argument (`:38`), plus once more as a string id, before calling one feature method at
`:41`. In `packages/demo/src/path-resolver.ts` the first feature call is 24 lines after construction.

### 2.2 The naming leak

The word "Plugin" appears 50 times in the demo sources and pages and 53 times in the addons README. It reaches
end-user-visible UI text: `packages/demo/index.html:30` advertises a page as "OverlaysPlugin",
`packages/demo/pages/overlays.html:13` has `<h1>OverlaysPlugin demo</h1>`.

Your instinct is right, and the repo already contains the counter-example. `packages/demo/src/plugins-by-name.ts:42`
is the only site that names the retrieved object after the capability rather than the mechanism:

```ts
const styleRegistryByName = bpmnVisualization.getPlugin<StyleByNamePlugin>('style-by-name');
```

The rest of that file reads `styleRegistryByName.updateStyle(...)` with no plugin vocabulary, and it is measurably
easier to read than the four sites that write `overlaysPlugin.addOverlays(...)`. Note what remains leaked even there:
the class name and the id. Naming the variable is a convention fix, not a mechanism fix.

Worth separating two questions that the current design conflates. "Plugin" is useful vocabulary for the **author**
(it names the contract they implement). It is noise for the **consumer**, who wanted overlays. Every library that
made this transparent did so by having the extension install API onto the host object, not by renaming things.

### 2.3 Correctness defects found while reading

- **`dispose()` is not idempotent for plugins.** `plugins-support.ts:130-133` always runs the `onDispose` loop, while
  the core's guard `if (this.disposed) return;` sits behind `super.dispose()` and `disposed` is private, so the
  subclass cannot check it. Two `dispose()` calls run every `onDispose` twice. Only single-call disposal is tested
  (`test/spec/plugins-support.test.ts:182-184`).
- **No hook is wrapped in `try`/`catch`** (`plugins-support.ts:167-171`). A throwing `onDispose` aborts the loop and
  prevents `super.dispose()`, so the graph is never destroyed. A throwing `onBeforeLoad` prevents the load entirely. A
  throwing `onLoadError` masks the original error. CodeMirror, by contrast, catches a crashing plugin, destroys it and
  deactivates it, explicitly so one extension cannot take down the view.
- **The plugin map is never cleared on dispose.** No `this.plugins.clear()` exists, so `getPlugin` keeps returning live
  instances after disposal and the map holds them alive. X6 has the identical bug (`installedPlugins` is not cleared
  by `Graph.dispose()`), which is mild consolation.
- **The duplicate-id throw leaks a graph.** The check at `plugins-support.ts:155` runs after `super(options)` has
  already built the mxGraph, and there is no cleanup path, so a duplicate id throws out of the constructor leaving an
  undisposed graph.
- **Unrelated to plugin design, but real:** `StyleByNamePlugin.updateStyle` and `resetStyle` cast
  `string | string[]` to `string[]` (`plugins/style.ts:103`, `:115`) and `BpmnElementsSearcher.getElementsByNames`
  filters with `names.includes(element.name)` (`bpmn-elements.ts:93`). With a single string that is
  `String.prototype.includes`, so `updateStyle('Task 1', ...)` also matches an element named `Task`. Passing a plain
  string is part of the documented signature, so this is reachable from normal use, and no test covers it.
- **The typings-validation package never exercises the plugin API.** `packages/check-ts-support/src/index.ts:18`
  imports `BpmnVisualization` from `bpmn-visualization`, not from the addons package, and the file contains zero uses
  of `plugins:` or `getPlugin`. So `PluginConstructor`, `getPlugin` and the `GlobalOptions` module augmentation, which
  is the riskiest typing construct in the package, are never checked against the minimum supported TypeScript version.
  It also reproduces, in the project's own code, the exact mistake the README (`packages/addons/README.md:38-43`) and
  the ADR (`docs/adr/0001-plugin-support.md:70`) warn consumers against, which is evidence that the warning is not
  discoverable enough.

## 3. Missing features

### For the plugin author

| Gap | Current state | Who else solves it |
|---|---|---|
| Declared dependencies | None. No `requires`, no way to fail when a needed plugin is absent | CodeMirror (`enables`/`provide` pull the dependency into the config), bpmn-js (`__depends__` on module objects, deduplicated by identity). maxGraph and X6 also have nothing |
| Load ordering | Array order, undocumented and unasserted. `test/spec/plugins-support.test.ts:159,193` register three plugins but only assert call counts, never relative order | CodeMirror `Prec` buckets, bpmn-js depth-first topological sort |
| Error isolation | None, see 2.3 | CodeMirror destroys and deactivates a crashing plugin |
| Per-plugin typed options | The whole `GlobalOptions` object is passed to every plugin twice (`plugins-support.ts:153`, `:163`). Namespacing is a README convention (`README.md:88-124`), unenforced and unread by the code | Chart.js namespaces `options.plugins.<id>` and types it by declaration merging, so a typo is a compile error. xterm.js and X6 sidestep it: options are ordinary constructor arguments |
| Options validation | None anywhere. The only thrown error in the system is the duplicate-id one | Chart.js (typed), xterm.js (typed constructor) |
| Adding API surface | A plugin's methods live on the plugin object; the consumer must fetch the object | X6 and Cytoscape install methods on the host so the feature reads as native |
| Cross-plugin communication | Only `getPlugin` from inside a plugin, which no shipped plugin uses | bpmn-js event bus, ProseMirror plugin keys |

### For the consumer

| Gap | Current state | Who else solves it |
|---|---|---|
| Knowing whether a plugin is loaded | Nothing. No `hasPlugin`, no `getPlugins`, no log, no warning. The only signal is a `TypeError` | Chart.js `registry.getPlugin` throws on miss |
| Knowing what a plugin adds | Must read the `.d.ts` or the source. The README says so outright: "The id is defined in the plugin implementation" (`README.md:54`). Descriptions are one line and incomplete: `README.md:67` describes the overlays plugin without naming `setVisible`, the method the demo actually calls (`demo/src/overlays.ts:54`) | ProseMirror and CodeMirror export plain functions, so the API is the module's exports |
| Add or remove after construction | Impossible. No unregister, no re-registration | X6 `disposePlugins`, CodeMirror `Compartment` reconfiguration, ProseMirror `state.reconfigure` |
| Enable/disable without unloading | Impossible | X6 `enablePlugins`/`disablePlugins`, Chart.js `options.plugins.<id> = false` |
| Version compatibility | Nothing links a plugin to a core version | v2 X6 used peer dependencies per plugin package |

Two gaps I expected and did **not** find: there is no ordering-dependency bug in practice (no shipped plugin depends
on another, verified by grep), and no plugin registers listeners or timers, so the absent teardown leaks less than it
could. But no shipped plugin implements `onDispose` either, while `OverlaysPlugin` caches a DOM node from a graph that
`dispose()` destroys (`plugins/overlays.ts:27-28`).

## 4. How comparable browser libraries do it

Build-time Node tools (Vite, Rollup, ESLint) are excluded on purpose: their loading model resolves plugins by package
name at runtime, which a browser library cannot do. One idea from them transfers and is noted in 5.C.

| | Load by | Retrieve by | Cast? | Deps | Hooks | Global state | Transparent to consumer |
|---|---|---|---|---|---|---|---|
| **addons (today)** | class | string id | yes | no | 5 | none | no |
| maxGraph 0.24 | class | string id | yes | no | 1 | none | no |
| bpmn-js 18 | module declaration map | string id | yes (opt-in map) | `__depends__` | `__init__` + event bus | none | no |
| X6 3.1 | instance | string id (undocumented) | yes | no | 3 + 3 optional | prototype patching, CSS | **yes** |
| G6 v5 | **string id**, or `{ type, key }` | `getPluginInstance(key)` | yes, `as unknown as T` | no | 3 | **global registry** | partly, config is declarative |
| Chart.js 4 | object with an id | id, rarely needed | **no** | no | ~35 | registry singleton | **yes**, via options |
| CodeMirror 6 | value | typed handle | **no** | `enables`/`provide` | many | none | mostly |
| ProseMirror 1 | instance | typed `PluginKey<T>` | **no** | no | many | none | yes, via exported functions |
| xterm.js 5/6 | instance | **nothing to retrieve** | **no** | no | 2 | none | no, deliberately |
| Cytoscape 3 | global `use()` | prototype method | n/a | no | none | heavy | **yes** |

Two observations that matter more than the table.

**Retrieval by an author-written string is the minority design.** Only maxGraph, X6, G6, bpmn-js and Chart.js do it.
The first four pay for it with an unchecked cast, exactly as this package does, and G6 goes further with a double cast
`as unknown as T` over a vacuous `T extends BasePlugin<any>` bound. Chart.js escapes only because its
retrieval path is vestigial: `Chart.registry.getPlugin(id)` returns the shared singleton typed as a bare `Plugin`, and
the consumer is not meant to call it, since a Chart.js plugin is configured through namespaced options rather than
invoked. CodeMirror and ProseMirror use a token whose identity is the key.
xterm.js has no retrieval API at all: `loadAddon(new FitAddon())` takes the instance the consumer already holds, so
there is nothing to look up, no id namespace, no `T` to get wrong.

**The transparency you want has exactly one proven mechanism: install the API on the host.** X6 ships a per-plugin
`api.ts` that both augments the `Graph` interface via `declare module` and patches `Graph.prototype`, so after
`graph.use(new Selection())` the consumer writes `graph.select(node)`. `getPlugin` is an escape hatch, not the normal
path, which is why it was never documented. The cost is visible in the same source: calling `graph.select()` without
having loaded the plugin is a **silent no-op** returning `this`, and the prototype patching is page-global and
defeats tree-shaking.

## 5. Alternatives

### A. Typed id-to-type map via declaration merging

Add an interface that plugin packages augment, and overload `getPlugin`:

```ts
export interface PluginRegistry {
  overlays: OverlaysPlugin;
  style: StylePlugin;
  // third parties add their own by module augmentation
}

getPlugin<K extends keyof PluginRegistry>(id: K): PluginRegistry[K] | undefined;
getPlugin<T extends Plugin>(id: string): T | undefined;
```

Consumer before and after:

```ts
// before
const overlaysPlugin = bpmnVisualization.getPlugin<OverlaysPlugin>('overlays');
// after: no type argument, correct type, mismatch impossible
const overlays = bpmnVisualization.getPlugin('overlays');
```

This is Chart.js's mechanism (`PluginOptionsByType` augmentation) applied to retrieval instead of options, and it is
what bpmn-js's `Diagram<ServiceMap>` type parameter tries to do but never populates. Fixes the cast and the id-type
drift. Fixes nothing else.

### B. Instance-based loading

Pass instances instead of classes, and give the contract an `init(bpmnVisualization)` hook:

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

This is xterm.js and X6. It dissolves the asymmetry at its root rather than papering over it: the consumer already
holds a correctly typed reference, so retrieval becomes optional and exists only for cross-plugin lookup. Per-plugin
options become ordinary typed constructor arguments, which removes the `GlobalOptions` namespacing convention, the
double-passing of the whole options object, and the need for `onConfigure` in most cases. Ids remain, for
cross-plugin lookup and duplicate detection only.

### C. Host API augmentation

Each plugin augments the `BpmnVisualization` interface and installs its methods, so the consumer writes
`bpmnVisualization.addOverlays(...)` and never mentions plugins after registration. This is X6 and Cytoscape.

It delivers exactly the transparency you described, and I recommend against it as the primary design. It rebuilds the
monolithic API that a plugin system exists to avoid, it makes a missing plugin a silent no-op instead of an error, it
requires prototype patching that is page-global in a library whose current cleanliness on that front is its best
property, and every consumer pays the type-surface cost of every plugin. A narrow version is defensible: install a
single namespaced accessor per plugin rather than flat methods.

If ordering is ever added, Rollup's `enforce: 'pre' | 'post'` is the one build-tool idea that transfers, and it is
the same shape as CodeMirror's `Prec` buckets: a coarse author-supplied hint that composes with consumer array order
without either side owning a numeric sort key.

### D. Typed token (ProseMirror `PluginKey`)

Export a token from the plugin module and retrieve through it: `const overlays = bv.get(overlaysToken)`. Kills the
cast, makes id collisions impossible by construction (ProseMirror generates and disambiguates the underlying string),
and allows real encapsulation, since a package can keep its token private and export only functions. It is the most
principled option and the least aligned with the current codebase, since it adds a concept without removing the
ceremony that motivated the question.

### E. Global id-to-implementation registry, load by id

This is the design the review was originally asked to consider, and G6 v5 implements it exactly:

```ts
register(ExtensionCategory.PLUGIN, 'my-plugin', MyPlugin); // built-ins pre-registered at import
const graph = new Graph({ plugins: ['grid-line', { type: 'tooltip', key: 'my-tooltip' }] });
graph.getPluginInstance<Tooltip>('my-tooltip');
```

It makes loading and retrieval symmetric, which is the stated complaint, and it buys one capability nothing else here
provides: **the configuration becomes serializable**. A viewer whose plugin set comes from JSON can name a plugin the
calling code never imported. It also allows overriding a built-in by re-registering its id.

I recommend against it, on evidence from the reference implementation itself:

- **It does not buy tree-shaking**, which is the usual justification. G6 grepped clean for any tree-shaking rationale
  across its entire docs tree, has no `sideEffects` field, no `exports` map and no lighter entry point, and
  `import '@antv/g6'` runs `preset.ts` which statically registers every built-in. It pays the full cost on every
  import. The registry buys extensibility and runtime override, not bundle size.
- **It costs the property this package currently has and G6 does not**: a module-level mutable registry, page-global.
  Re-registering an id affects every graph on the page, including ones already constructed, and there is no way to
  scope an override to one instance.
- **It does not fix type safety**, the actual defect. G6's `type` field is a bare `string` with no union, no
  declaration merging and no branded type, and its own test asserts that `{ type: 'unset' }` compiles.
- **It weakens error handling.** A missing registration in G6 is a `console.warn` and a silently skipped plugin, not a
  throw. This package currently fails fast on duplicate ids, which is stricter than G6, X6 and maxGraph.

Worth adopting only if declarative or serialized plugin configuration becomes a requirement. If it ever does, note
that A composes with it: the same id-to-type interface that types `getPlugin` would also type the config entries.

### Comparison

| | Ergonomics | Type safety | Tree-shaking | Author cost | Semver | Migration |
|---|---|---|---|---|---|---|
| A. Declaration merging | unchanged | **fixed** | unchanged | one interface augmentation per plugin | **additive** | none, old call sites keep compiling |
| B. Instance loading | **much better** | **fixed** | unchanged | `init(bv)` instead of constructor arg | **breaking** | mechanical, one line per registration |
| C. Host augmentation | **best** | good | **worse** | augmentation plus prototype patching | breaking, and permanently widens the API | large |
| D. Typed token | better | **fixed** | unchanged | export a token | breaking | moderate, new concept to learn |
| E. Global registry | symmetric, but unchanged | **not fixed** | **no gain, see E** | a `register` call per plugin | breaking | large, and adds page-global state |

## 6. Recommendation

**Do A now, plan B for the next major, reject C, keep D in reserve.**

A is additive, costs one interface, and removes the single worst property of the public API (a cast that silently
returns the wrong type). It can ship in a minor release with no consumer change. Pair it with the honest return type
`T | undefined`, which is technically breaking for `strict` consumers but converts a runtime crash into a compile
error, and with `hasPlugin`/`getPluginIds` so "is it loaded" stops being unanswerable.

B is the real answer to your asymmetry question, and it also fixes per-plugin options typing, which is the largest
authoring gap. It is breaking, so it belongs in the next major, and the migration is mechanical: `plugins:
[OverlaysPlugin]` becomes `plugins: [new OverlaysPlugin()]`. Note that A and B compose: keep `getPlugin` for
cross-plugin lookup and it stays typed.

On naming, no mechanism change is needed. Keep `Plugin` in class names and in the authoring contract, where it is
accurate, and make the consumer-facing convention name the capability, as `demo/src/plugins-by-name.ts:42` already
does. Have each plugin implement a named capability interface and document the feature, not the plugin. Under B the
question largely dissolves anyway, because the consumer names the variable once at construction and never performs a
lookup.

Weigh both against maxGraph before committing, since the two implementations are deliberately kept close (see 7). A
is the easier sell upstream: it is additive, it needs no change to the plugin contract, and maxGraph has the same
unchecked cast in `getPlugin` and the same `PluginId` union to hang the map on. B changes the contract, so it is
worth agreeing on there before shipping it here, otherwise the two designs fork on the one axis they currently share.
The richer lifecycle already shipped here (five hooks against maxGraph's single `onDestroy`) shows the porting
direction works in practice.

Independently of all this, fix the defects in 2.3. The `StyleByNamePlugin` substring match and the missing hook
isolation are bugs today, not design debt, and `check-ts-support` should exercise the plugin API since that is the
only thing standing between the module augmentation and a broken release.

## 7. Premise corrections

Both reference points you supplied need correcting, and both corrections weaken the case for imitating them.

- **bpmn-js.** "Modules are configured as objects, services retrieved by id from the injector" is correct but
  under-specified. A module is a declaration map binding a string id to a `['type'|'factory'|'value', impl]` tuple.
  More importantly, **its retrieval is no safer than yours**: `Diagram.get<T>(name: string): T` is the same unchecked
  cast. Compiled against the published packages with `strict: true`, `viewer.get('totallyNotAService')` yields
  `unknown` and `tsc` exits 0. bpmn-js ships no service map for its own services, and its documented pattern is a
  manual cast. What it does have that you lack is `__depends__` with identity-based deduplication and deterministic
  topological ordering. What it costs is a DI container the extension author must learn, including the trap that a
  listener-only extension is never constructed unless named in `__init__`.
- **AntV X6 and AntV G6.** "Ids and implementations associated in a global registry, loading by id" is **wrong for
  X6** and **exactly right for G6 v5**, which is a different AntV library. The description was accurate; it was
  attributed to the wrong project.
  - X6 passes a live instance to a per-graph `Set` (`graph.use(new Selection({...}))`) in every version that has
    plugins. No id is passed at load time, and there is no global plugin registry. The premise does describe a
    different X6 subsystem: routers, connectors, markers, tools and highlighters do live in a global `Registry`
    resolved by name.
  - G6 v5 matches every clause: `EXTENSION_REGISTRY.plugin` is a module-level object keyed by string,
    `register(ExtensionCategory.PLUGIN, 'name', Impl)` populates it, built-ins auto-register at import through
    `preset.ts`, and the consumer writes `plugins: ['minimap']` or `plugins: [{ type: 'tooltip', key: 'my-tooltip' }]`.
    The graph never receives a class or an instance. See alternative E for why I still recommend against it, and note
    that G6 v4 used the X6 model (instances via `addPlugin`), so the registry is the v5 rewrite. Any claim about "G6"
    without a version is half wrong.
  - Sources of confusion, both verified: the two libraries are siblings with near-identical names, and
    `x6.antv.vision` still returns 200 while serving the **v1** site, where these features were `Graph` options rather
    than plugins. X6's plugin interface has also never been documented in any version, so its model must be inferred
    from source.
- **maxGraph is the model, but not the substrate.** Two separate things were conflated during the review, and both
  matter. maxGraph is *not* the layer underneath: `bpmn-visualization@0.48.0` depends on `mxgraph@4.2.2`, and mxGraph
  has no plugin concept at all (zero occurrences of "plugin" in its 13k-line `mxGraph.js`; handlers were hard-wired
  fields built by factory methods). But maxGraph *is* where this design came from: per the maintainer, the maxGraph
  plugin implementation was used as the base for plugin support here, and improvements made here have since been
  ported back to maxGraph. That explains the `BuiltinPluginId | (string & Record<never, never>)` idiom which
  `plugins-support.ts:120` reproduces character for character, and it reframes the resemblance as a maintained
  two-way relationship rather than convergence.

  **None of this is recorded anywhere in the repository.** Greps for "maxGraph" across the full git history, the
  README and the ADR return nothing, so the lineage exists only in the maintainers' heads. That is a finding in its
  own right: ADR 0001 should state it, because it changes how a reader should weigh every design decision below, and
  because the next person to touch this code will otherwise assume the freedom to diverge.

  The consequence for the rest of this document is real. "We match the layer below us" was never available as a
  defense of the status quo, and still is not. What is available, and is stronger than the independent-convergence
  reading I first drew, is that the design has a second stakeholder: changes here are candidates for porting to
  maxGraph, and divergence has an ongoing maintenance cost that a standalone library would not pay.

## 8. Not verified

- Bundle-size magnitudes are unmeasured everywhere in this document. Tree-shaking claims rest on `sideEffects`
  metadata and module structure, not on built bundles.
- Whether `OverlaysPlugin` tolerates a missing container is untested and unclear from source (`plugins/overlays.ts:27`).
- Whether the non-nullable `getPlugin` return type is deliberate or an oversight. The code has no comment and the
  test at `test/spec/plugins-support.test.ts:13` documents the behavior without stating intent.
- Chart.js plugin call ordering is undocumented upstream and was read off the implementation, so it is not a contract.
- ADR 0001 is still `status: draft` (`docs/adr/0001-plugin-support.md:2`), which `docs/README.md:13` defines as "not
  yet ready for review", so the only architectural rationale a consumer can read is officially unratified.
- `CLAUDE.md:60-67` lists only `getPluginId` and `onConfigure` under "Plugin Lifecycle", missing the four hooks added
  in 0.10.0.
