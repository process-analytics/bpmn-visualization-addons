# 001: the plugin system

How plugins are loaded, retrieved, configured, notified and torn down in `@process-analytics/bpmn-visualization-addons`,
compared with nineteen browser libraries, and which design to move to.

This analysis follows the conventions described in the [analyses README](../README.md).

- **Dates**: 2026-08-12 to 2026-11-17, see the header of the main analysis for what was added when.
- **Analysis basis**: commit `94519a2` for the main analysis, `f1b4616` for the companion.
- **Recommendation**: a typed registry by declaration merging with a `features` accessor now, per-plugin configuration
  through `usePlugin`, instance loading for the next major. See section 6 of the main analysis.
- **Status**: in progress, no decision recorded yet.

## Files

| File | Content |
|---|---|
| [`bv-addons_plugin_system_analysis_94519a2.md`](./bv-addons_plugin_system_analysis_94519a2.md) | The main analysis: strengths, weaknesses, missing features, the alternatives and the recommendation, with the per-library detail in its appendix. Start here |
| [`bv-addons_plugin_lifecycle_and_events_analysis_f1b4616.md`](./bv-addons_plugin_lifecycle_and_events_analysis_f1b4616.md) | The companion: what happens after a plugin is loaded, lifecycle hooks, event systems, error isolation and teardown, over the same corpus |
| [`plugin-registry-probes/`](./plugin-registry-probes/README.md) | The TypeScript probes behind sections 5.A, 5.F and 5.G of the main analysis, runnable, with their verdicts. Their compiler errors are the measurement, not a defect |
| [`analyze_plugin_system_by_deepwiki_20260506.md`](./analyze_plugin_system_by_deepwiki_20260506.md) | An earlier pass made with DeepWiki on 2026-05-06, kept so that Appendix B of the main analysis can be checked |
| [`bv-addons_plugin_system_analysis_prompt.md`](./bv-addons_plugin_system_analysis_prompt.md) | The prompt the main analysis was produced from, kept verbatim: the location it names for the output is the original one, at the repository root |

## Running the probes

From the repository root, after `nvm use` and `npm install`:

```bash
./docs/analyses/001-plugin-system/plugin-registry-probes/run-probes.sh
```
