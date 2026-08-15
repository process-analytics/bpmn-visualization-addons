# Plugin registry TypeScript probes

Compilable evidence behind the typed plugin registry proposal in
[`bv-addons_plugin_system_analysis_94519a2.md`](../../bv-addons_plugin_system_analysis_94519a2.md), specifically
[section 5.A, "Typed id-to-type map via declaration merging"](../../bv-addons_plugin_system_analysis_94519a2.md#a-typed-id-to-type-map-via-declaration-merging)
and
[section 5.F, "Namespaced accessor typed by an augmentable interface"](../../bv-addons_plugin_system_analysis_94519a2.md#f-namespaced-accessor-typed-by-an-augmentable-interface).

Those sections make claims about what the TypeScript type system can and cannot express: whether a plugin id survives
as a literal type, whether a third party can extend a registry interface through a package that publishes only a root
entry point, whether a host can be generic over the plugins it was given. None of that is safe to assert from memory.
Each claim here was settled by writing a minimal program and compiling it, and the compiler output is the evidence.

## Read this before running anything

**Almost every probe reports TypeScript errors, and that is the expected result, not a failure.**

The probes measure inferred types. The technique is to assign a value of the type under study to an impossible target:

```ts
declare const a: (typeof OverlaysPlugin)['pluginId'];
const _a: 0 = a;
```

This cannot compile. It is not meant to. The error text names the type on the left-hand side, which is the answer:

```
error TS2322: Type '"overlays"' is not assignable to type '0'.
```

Read that as "the static `pluginId` is the literal type `'overlays'`". Had the answer been `string`, the same line
would have said `Type 'string' is not assignable to type '0'`. A probe line that produces **no** error is also a
result, and the probe sources say so in a comment where it matters.

Consequently `run-probes.sh` never aborts on a failing project and exits 0 regardless. Do not "fix" a probe that
reports errors. If the output stops matching the table below, TypeScript's behaviour changed, and that is the finding.

## Running

```bash
nvm use                              # the repo pins its Node version in .nvmrc
npm install                          # the probes use the repo's own TypeScript
./tools/plugin-registry-probes/run-probes.sh
```

The runner prints the TypeScript version it used, then each probe project's `tsc` output under a labelled header.
It calls `q5-module-augmentation/generate.sh` first, which is also runnable on its own.

**TypeScript version: 5.9.2**, resolved from `node_modules/typescript` at the repository root (pinned as `~5.9.2` in
the root `package.json`). Every probe project extends `tsconfig.base.json`, which mirrors the settings the published
package is built and consumed under: `strict`, `target: ES2017`, `module: ES2015`, `moduleResolution: node`,
`isolatedModules`, plus `noEmit`. Relative import specifiers carry the `.js` extension, as everywhere else in this
repository. Two projects deliberately deviate and say why in their own `tsconfig.json`:
`q5-module-augmentation/app-bundler` (`moduleResolution: bundler`) and `q5-module-augmentation/pkgsrc` (emits
declarations).

## Layout

| Directory | Question |
| --- | --- |
| `q1-static-id-forms/` | Q1, declaration forms for a static id |
| `q2-static-enforcement/` | Q2, where a missing static member is reported |
| `q3-literal-through-array/` | Q3, literal preservation through an array of constructors |
| `q4-generic-host-features/` | Q4, host generic over its loaded plugins |
| `q5-module-augmentation/` | Q5, augmenting a registry interface through a barrel re-export |
| `q6-overload-shadowing/` | Q6, overload ordering for `getPlugin` |
| `r1-instance-id-forms/` | R1, declaration forms for an instance id |
| `r2-instancetype-extraction/` | R2, Q4 rebuilt on an instance property |
| `r3-implements-enforcement/` | R3, `implements` catching a missing instance id |
| `r4-static-from-instance-method/` | R4, reading a static id from inside an instance method |
| `r5-subclassing/` | R5, inheritance and redeclaration of the id |

`q5-module-augmentation/` holds several consumer projects rather than one, because the question is precisely whether
the answer depends on the module specifier and the resolution mode:

| Project | Setup |
| --- | --- |
| `rel-barrel/` | relative specifier, augmentation targets the barrel that only re-exports |
| `rel-direct/` | relative specifier, augmentation targets the module that declares the interface |
| `rel-in-index/` | control, interface declared directly in the entry point |
| `app/` | package name, real `node_modules`, classic node resolution |
| `app-none/` | negative control, no augmentation at all |
| `app-subpath/` | package name, augmentation targets a subpath specifier |
| `app-sepfile/` | augmentation in its own module that nothing imports |
| `app-bundler/` | `moduleResolution: bundler` with an `exports` map exposing only `"."` |
| `combined/` | composition: generic host plus `getPlugin` plus third-party augmentation |

`pkgsrc/` is the source of the simulated published package and `pkg-template/` holds its two `package.json` variants.
`generate.sh` compiles `pkgsrc/src` to `.d.ts` and installs the result as a real `node_modules/my-pkg` inside each
consumer project, so augmentation is exercised against emitted declarations resolved through `node_modules` rather
than against TypeScript sources or a `paths` mapping. Those generated directories are gitignored; the script is the
committed source of truth.

## Verdicts

| # | Question | Verdict |
| --- | --- | --- |
| Q1 | `typeof P['pluginId']` for a static id | `static readonly pluginId = 'overlays'` keeps the literal `'overlays'`. Dropping `readonly` or annotating `: string` widens to `string`; `as const` is redundant. An instance `getPluginId(): string` gives `string` and no static-side property at all, so it is unusable for type-level keying. |
| Q2 | Does a constructor-typed interface enforce the static member, and where | No error at the class declaration: `implements` checks only the instance side. The error surfaces at the use site (array literal, call argument). `X satisfies PluginConstructor`, a `definePlugin` helper, and a `static { }` block each force the check at the declaration. |
| Q3 | Literal preservation through an array | A non-generic `PluginConstructor[]` recovers nothing. A generic `P extends readonly AnyPluginCtor[]` preserves the literal union in every call shape, with or without `as const`, inline or via a variable. Omitting `plugins` yields `never`. Annotating the id `: PluginId` (the widening idiom) destroys the literal; `satisfies PluginId` keeps it. |
| Q4 | Host generic over its loaded plugins | Viable. `.features.overlays` compiles and `.features.style` is a hard error in the same expression. Degrades in two realistic ways: annotating the array `: PluginCtor[]` collapses it to `Pick<..., never>` so every access errors, and conditional composition yields an optimistic union, so the type can claim a plugin that runtime did not load. |
| Q5 | Augmentation through a barrel re-export | **Merges.** Augmenting the package root merges into the interface declared in `plugins-support.ts`, visible from the root import, from the subpath, and from inside the library itself. Works under classic node resolution and under `bundler` with an `exports` map exposing only `"."`. Moving the interface into `index.ts` is not required. The negative control confirms `keyof PluginRegistry` is genuinely `never` without the augmentation. The augmenting file must be in the program, but need not be imported. |
| Q6 | Overload shadowing | Order is decisive. Typed overload first, `getPlugin('overlays')` resolves to `OverlaysApi \| undefined`; reversed, it degrades to `Plugin \| undefined`. With the loose overload present in either order, `getPlugin('typo')` compiles silently. A single conditional-return signature gives the typed result without the ordering hazard. |
| R1 | Literal preservation on the instance side | Same as the static side: `readonly pluginId = 'overlays'` keeps the literal. Two instance-only traps: an inferred getter widens to `string`, and a constructor parameter property with a default widens to `string` even with `readonly`. |
| R2 | `InstanceType` extraction | `InstanceType<P[number]>['pluginId']` yields the literal union exactly as the static path does. Q4's host rebuilt on an instance property behaves identically in every case, and the constructor type no longer needs a static member. |
| R3 | `implements` enforcement | Strictly stronger than the static case. A missing instance id is TS2420 on the class's `implements` clause; a wrong type is TS2416 on the member. No `satisfies` workaround needed. A misspelled optional method is still accepted by both forms. |
| R4 | Reading a static id from an instance method | `this.constructor` is typed `Function`, so `this.constructor.pluginId` does not compile. A hardcoded class name or a cast to `typeof TheClass` compiles and keeps the literal; a cast to the constructor interface compiles but degrades to `string`. For the hybrid, `readonly pluginId = MyPlugin.pluginId` keeps the literal on both sides; an unannotated getter silently widens to `string`. |
| R5 | Subclassing | Both forms inherit the id and its literal type, and both reject redeclaring it with a different literal (TS2417 static, TS2416 instance). Widening the base to `string` allows redeclaration but disables the generic host. An `abstract readonly pluginId: string` base does let each subclass declare its own literal; there is no static equivalent, since `abstract static` is rejected (TS1243). |

## Note for maintainers

The root `lint` script globs `**/*.{js,cjs,mjs,ts,cts,mts}`, so these `.ts` files are in scope for ESLint, but
`eslint.config.mjs` sets `parserOptions.project` to `./packages/**/tsconfig.json` and `./tsconfig.eslint.json`, and
neither covers `tools/`. Linting this directory therefore fails on project inclusion rather than on any rule. See the
handover notes accompanying this directory; deciding how to resolve it (ignore `tools/` or add it to
`tsconfig.eslint.json`) is a lint-configuration change and was deliberately left to the maintainers.
