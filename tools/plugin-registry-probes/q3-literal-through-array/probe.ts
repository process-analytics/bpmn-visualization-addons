/*
Copyright 2026 Bonitasoft S.A.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Q3: literal preservation of pluginId through an array of constructors.
export interface Host0 { readonly n: number }
export interface Plugin { doThing(): void }

export class OverlaysPlugin implements Plugin {
  static readonly pluginId = 'overlays';
  constructor(_h: Host0) {}
  doThing(): void {}
}
export class StylePlugin implements Plugin {
  static readonly pluginId = 'style';
  constructor(_h: Host0) {}
  doThing(): void {}
}

// ---------- (1) non-generic option: PluginConstructor[] with pluginId: string ----------
export interface PluginConstructor { readonly pluginId: string; new (h: Host0): Plugin }
export class HostA {
  constructor(_o: { plugins?: PluginConstructor[] }) {}
}
declare function idsOf<T extends { plugins?: readonly { pluginId: string }[] }>(o: T): NonNullable<T['plugins']>[number]['pluginId'];
const a1 = idsOf({ plugins: [OverlaysPlugin, StylePlugin] });
const _a1: 0 = a1; // literal union or string?

// ---------- (2) generic class, constraint pluginId: string ----------
export interface AnyPluginCtor { readonly pluginId: string; new (h: Host0): Plugin }
export class HostB<P extends readonly AnyPluginCtor[] = []> {
  declare readonly ids: P[number]['pluginId'];
  constructor(_o: { plugins?: P }) {}
}
const b1 = new HostB({ plugins: [OverlaysPlugin, StylePlugin] }).ids;
const _b1: 0 = b1; // inline array, no as const

const bArr = [OverlaysPlugin, StylePlugin];
const b2 = new HostB({ plugins: bArr }).ids;
const _b2: 0 = b2; // array in a separate `const` variable (mutable array type)

const b3 = new HostB({ plugins: [OverlaysPlugin, StylePlugin] as const }).ids;
const _b3: 0 = b3; // inline array with `as const`

const bArrConst = [OverlaysPlugin, StylePlugin] as const;
const b4 = new HostB({ plugins: bArrConst }).ids;
const _b4: 0 = b4; // separate variable with `as const`

const b5 = new HostB({}).ids;
const _b5: 0 = b5; // plugins omitted -> default []

// ---------- (3) `const` type parameter modifier ----------
export class HostC<const P extends readonly AnyPluginCtor[] = []> {
  declare readonly ids: P[number]['pluginId'];
  constructor(_o: { plugins?: P }) {}
}
const c1 = new HostC({ plugins: [OverlaysPlugin, StylePlugin] }).ids;
const _c1: 0 = c1;

// ---------- (4) the repo's widening idiom on the declared type ----------
export type PluginId = 'overlays' | 'style' | (string & Record<never, never>);
export class WidenedPlugin implements Plugin {
  static readonly pluginId: PluginId = 'overlays';
  constructor(_h: Host0) {}
  doThing(): void {}
}
export class WidenedPlugin2 implements Plugin {
  static readonly pluginId = 'style' satisfies PluginId;
  constructor(_h: Host0) {}
  doThing(): void {}
}
const d1 = new HostB({ plugins: [WidenedPlugin] }).ids;
const _d1: 0 = d1; // annotated `: PluginId`
const d2 = new HostB({ plugins: [WidenedPlugin2] }).ids;
const _d2: 0 = d2; // `satisfies PluginId` instead of an annotation

export const keep = [_a1, _b1, _b2, _b3, _b4, _b5, _c1, _d1, _d2];
