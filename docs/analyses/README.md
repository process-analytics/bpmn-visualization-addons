# Analyses

This directory records preliminary studies made before a decision: how the current code behaves, what comparable
libraries do, which designs are possible, and what each of them would gain, cost and break. They answer "what should
we do, and is it worth starting?" for work whose design or cost is not obvious from the code.

An analysis is not a decision. When it leads to one, the decision is recorded in an
[Architecture Decision Record](../README.md#architecture-decision-records-adr) that links back to the analysis.

## Conventions

- One subject per directory, named `NNN-short-title/`, numbered sequentially and never renumbered. The directory holds
  the analysis and everything it depends on: companion documents, the prompt it was produced from, earlier passes it
  is compared with, and the probes behind its claims. Its `README.md` lists those files and what each one is for.
- The header states the dates, the question, and the **analysis basis**: the commit every `file:line` reference points
  to. Line numbers go stale as the code moves, so the basis is what keeps them checkable. File names carry the short
  SHA of that basis.
- Every claim is cited: `file:line` in this repository, or a permalink pinned to a full commit SHA for a third-party
  library. What could not be verified is listed as such rather than left implicit.
- A claim about what TypeScript accepts is settled by a compiled probe, kept and runnable in the directory of the
  analysis it backs, not asserted from memory.
- End with a recommendation.
- While an analysis is in progress it may be extended, and each addition is dated in its header. Once a decision is
  taken, it is not rewritten when the code or the decision moves on: a new analysis replaces it, and the old one links
  to its successor.
- Line width 120, consistent with the rest of the repository.

## Index

| Analysis | Subject | Dates | Recommendation | Status |
|---|---|---|---|---|
| [001](./001-plugin-system/README.md) | The plugin system: loading, retrieval, per-plugin configuration, lifecycle hooks and events, compared with nineteen browser libraries | 2026-08-12 to 2026-11-17 | A typed registry by declaration merging with a `features` accessor now, per-plugin configuration through `usePlugin`, instance loading for the next major | In progress, no decision recorded yet |
