# Prompt: plugin system analysis

Analyze and criticize the plugin system of `packages/addons`. Ground every claim in the actual code and cite
`file:line`. Do not change any code: this task produces a document only.

## Scope

Cover strengths, weaknesses, ease of use for a consumer, and ease of authoring a new plugin.

### 1. Frictions to examine first

1. **Load/retrieve asymmetry.** Plugins are loaded by passing implementations (`options.plugins: PluginConstructor[]`)
   but retrieved by passing a string id (`getPlugin<T>(id)`). Compare with two references:
   - bpmn-js: modules are configured as objects, services are retrieved by id from the injector.
   - AntV X6: ids and implementations are associated in a global registry, loading is done by id which resolves to the
     implementation through that registry.

   Verify how these two libraries actually work from their documentation or source. Do not rely on the description
   above, nor on memory. Explicitly flag anything that could not be verified, and correct the premise if it turns out
   to be wrong.

2. **The `Plugin` naming convention leaking into consumer code.** Class names contain `Plugin`, retrieval goes through
   `getPlugin`, and the examples store the instance in a constant whose name contains `Plugin` (usually matching the
   class name). What a consumer actually wants is more features; the fact that they come from a plugin should normally
   be transparent. Assess how much the plugin mechanism leaks into the public API and whether that leak is justified.

3. **Type safety of `getPlugin<T>(id)`.** The generic is an unchecked cast today: a wrong id or a wrong type parameter
   fails at runtime, not at compile time.

### 2. Missing features

Identify capabilities the system lacks, split by who is hurt.

For the **plugin author**, consider at least:
- declared dependencies between plugins (for example whether `StyleByNamePlugin` requires `ElementsPlugin`), load
  ordering, and loud failure when a dependency is absent;
- lifecycle hooks beyond what exists today (`onConfigure`, plus the load/dispose hooks documented in the ADR): diagram
  loaded, before/after render, error handling, teardown;
- communication between plugins (event bus versus direct handles);
- typed, validated per-plugin options;
- how a plugin extends the public API surface instead of sitting beside it.

For the **consumer**, consider at least:
- discovering what a plugin adds without reading its source;
- knowing whether a given plugin is loaded, and reacting when it is not;
- adding or removing a plugin after construction;
- configuration validation with actionable error messages;
- version compatibility between a plugin and the addons core.

This list is a starting point, not a checklist. Add gaps found in the code and remove items that turn out to be
non-issues, saying why.

### 3. Alternatives

Propose 2 to 4 concrete alternatives to the current design. For each one:
- consumer-side code, before and after;
- a short comparison grid: ergonomics, type safety, tree-shaking, authoring cost for a plugin author,
  breaking-change and semver impact, migration path.

Remember the constraints: `@process-analytics/bpmn-visualization-addons` is a published library with
`bpmn-visualization` as a peer dependency, so any alternative has a real migration cost for existing consumers.

End with a recommendation, not a neutral survey of options.

## Investigation method

Run the fact-gathering phase as parallel subagents, launched in a single batch so they execute concurrently. Four
independent strands:

1. **Internals** (read-only explorer): map `packages/addons/src/plugins-support.ts` and every plugin under
   `packages/addons/src/plugins/`. Report the plugin contract, the lifecycle hooks that actually exist, how plugins
   reach into `bpmn-visualization` internals, coupling and implicit dependencies between plugins, and the typing of
   `getPlugin`. Every finding with `file:line`.
2. **Consumer surface** (read-only explorer): how plugins are consumed in `packages/demo`, in the tests, in the README
   and in `docs/adr`. Report where the plugin mechanism leaks into consumer code (naming, casts, ordering assumptions,
   ceremony required before calling a feature). Every finding with `file:line`.
3. **bpmn-js premise check** (web research): how the module/injector system actually works, how a consumer configures
   modules and retrieves services, what it offers for plugin dependencies and lifecycle. Cite sources.
4. **AntV X6 premise check** (web research): how the registry associating ids and implementations actually works, how
   plugins are loaded and resolved, what it offers for plugin dependencies and lifecycle. Cite sources.
5. **Comparable browser libraries** (web research): survey how other browser-side runtime libraries expose extension
   points, and what each one solves that the current design does not. Cover at least:
   - **maxGraph** (`GraphPlugin`, `pluginId`, `getPlugin(id)`): the substrate under `bpmn-visualization`. Establish
     whether the current load/retrieve asymmetry was inherited from it or chosen deliberately.
   - **CodeMirror 6**: extensions as plain values, extensions including other extensions as dependency declaration
     without a registry, precedence for ordering, tree-shaking-first design.
   - **ProseMirror**: `PluginKey` as a typed retrieval handle instead of a bare string id.
   - **Chart.js**: per-instance versus global registration, and per-plugin options namespaced and typed through
     declaration merging.
   - **xterm.js addons**: instance-based `loadAddon`, `dispose`, and the addon naming convention.
   - **Cytoscape.js**: `cytoscape.use()` and global extension registration.
   - **AntV X6** and **bpmn-js**: already covered by strands 3 and 4 for their loading mechanism. Here, judge them on
     the same dimensions as the others rather than repeating the lookup: plugin dependencies and ordering, lifecycle
     hooks, typed retrieval, per-instance versus global state, tree-shaking, and how much of the plugin machinery the
     consumer has to see. For X6 in particular, assess what the global id-to-implementation registry buys and what it
     costs, since it is the design closest to a possible alternative here.

   Produce a single normalized comparison table covering every library above, so the same questions are answered for
   each one. Where a library has no answer for a dimension, say so instead of leaving the cell vague.

   Deliberately excluded: Vite, Rollup, ESLint and other build-time Node tools. Their hook contracts are transferable
   but their loading model is not, since it relies on runtime resolution of a plugin by package name, which a browser
   library cannot do. Mention them only if a specific hook-design idea is worth stealing, and say so explicitly.

Browser constraints to keep in mind while reading strands 3 to 5, because they invalidate designs that work fine in a
Node tool:

- tree-shaking: a global registry populated by import side effects makes unused plugins unremovable from the bundle;
- no runtime resolution of an implementation from a string id, unless every implementation is already bundled;
- per-instance state: several diagrams can coexist on one page, so plugin state cannot be module-global;
- explicit teardown: in a long-lived SPA, a missing `dispose` is a memory leak.

Rules for this phase:

- Subagent output is evidence, not conclusion. Do not paste it into the document as-is. Spot-check any claim that a
  finding or an alternative depends on, especially the two external premise checks: a confident but wrong subagent
  report is the main failure mode of this method.
- If strands 3 and 4 contradict the premises stated in section 1, say so explicitly in the document and rebuild the
  affected alternatives on the corrected facts.
- Designing the alternatives, filling the comparison grid and choosing the recommendation are not delegated. They stay
  in the main context, where all five strands are visible at once.

## Output

- File: `bv-addons_plugin_system_analyis_94519a2.md` at the root of the repository.
  (Name kept verbatim as requested, including the `analyis` spelling.)
- Dense decision aid, roughly 2 to 3 pages. No filler, no restating the obvious.
- Criticism is the point: do not soften findings, and state disagreements with the current design plainly.

## Handling

- This file is a scratch decision aid, not a document to commit. Warn me if it shows up in `git status` when I am about
  to commit, rather than including it.
- Analysis only: no source code changes, no prototype.
