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

// Q4: can Host be generic over its loaded plugins so `features` exposes only what was passed?
export interface Plugin { doThing(): void }
export interface HostLike { readonly n: number }

export interface OverlaysApi { addOverlay(id: string): void }
export interface StyleApi { updateStyle(id: string): void }
export interface PluginRegistry { overlays: OverlaysApi; style: StyleApi }

export interface PluginCtor { readonly pluginId: string; new (h: HostLike): Plugin }

export class Host<P extends readonly PluginCtor[] = []> {
  constructor(_options: { plugins?: P } = {}) {}
  get features(): Pick<PluginRegistry, Extract<P[number]['pluginId'], keyof PluginRegistry>> {
    return {} as never;
  }
}

export class OverlaysPlugin implements Plugin, OverlaysApi {
  static readonly pluginId = 'overlays';
  constructor(_h: HostLike) {}
  doThing(): void {}
  addOverlay(_id: string): void {}
}
export class StylePlugin implements Plugin, StyleApi {
  static readonly pluginId = 'style';
  constructor(_h: HostLike) {}
  doThing(): void {}
  updateStyle(_id: string): void {}
}
export class UnknownPlugin implements Plugin {
  static readonly pluginId = 'not-in-registry';
  constructor(_h: HostLike) {}
  doThing(): void {}
}

// ---- (1) inline array, one plugin ----
const h1 = new Host({ plugins: [OverlaysPlugin] });
h1.features.overlays.addOverlay('a'); // expect OK
h1.features.style; // expect ERROR: property does not exist

// ---- (2) inline array, both plugins ----
const h2 = new Host({ plugins: [OverlaysPlugin, StylePlugin] });
h2.features.overlays.addOverlay('a');
h2.features.style.updateStyle('a');

// ---- (3) plugins omitted ----
const h3 = new Host({});
h3.features.overlays; // expect ERROR
const h4 = new Host();
h4.features.overlays; // expect ERROR

// ---- (4) array built in a separate variable (mutable) ----
const pluginsVar = [OverlaysPlugin];
const h5 = new Host({ plugins: pluginsVar });
h5.features.overlays.addOverlay('a');
h5.features.style; // expect ERROR if inference held

// ---- (5) array built in a separate variable, as const ----
const pluginsConst = [OverlaysPlugin] as const;
const h6 = new Host({ plugins: pluginsConst });
h6.features.overlays.addOverlay('a');
h6.features.style; // expect ERROR if inference held

// ---- (6) variable annotated PluginCtor[] (a very common real-world shape) ----
const pluginsAnnotated: PluginCtor[] = [OverlaysPlugin];
const h7 = new Host({ plugins: pluginsAnnotated });
h7.features.overlays; // ?

// ---- (7) conditional plugin via spread of a ternary ----
declare const flag: boolean;
const h8 = new Host({ plugins: [OverlaysPlugin, ...(flag ? [StylePlugin] : [])] });
h8.features.overlays;
h8.features.style; // ?

// ---- (8) conditional plugin via ternary on the whole array ----
const h9 = new Host({ plugins: flag ? [OverlaysPlugin, StylePlugin] : [OverlaysPlugin] });
h9.features.overlays;
h9.features.style; // ?

// ---- (9) a plugin whose id is not a registry key ----
const h10 = new Host({ plugins: [OverlaysPlugin, UnknownPlugin] });
h10.features.overlays;

// ---- (10) explicit type argument ----
const h11 = new Host<[typeof OverlaysPlugin]>({ plugins: [OverlaysPlugin] });
h11.features.overlays;
h11.features.style; // expect ERROR
