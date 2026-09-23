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

// R2: Q4's generic host rebuilt with an INSTANCE pluginId instead of a static.
export interface HostLike { readonly n: number }
export interface OverlaysApi { addOverlay(id: string): void }
export interface StyleApi { updateStyle(id: string): void }
export interface PluginRegistry { overlays: OverlaysApi; style: StyleApi }

export interface Plugin { readonly pluginId: string; doThing(): void }
export interface AnyCtor { new (h: HostLike): Plugin }

export class OverlaysPlugin implements Plugin, OverlaysApi {
  readonly pluginId = 'overlays';
  constructor(_h: HostLike) {}
  doThing(): void {}
  addOverlay(_id: string): void {}
}
export class StylePlugin implements Plugin, StyleApi {
  readonly pluginId = 'style';
  constructor(_h: HostLike) {}
  doThing(): void {}
  updateStyle(_id: string): void {}
}
export class UnknownPlugin implements Plugin {
  readonly pluginId = 'not-in-registry';
  constructor(_h: HostLike) {}
  doThing(): void {}
}

export type IdsOf<P extends readonly AnyCtor[]> = InstanceType<P[number]>['pluginId'];

export class Host<P extends readonly AnyCtor[] = []> {
  constructor(_options: { plugins?: P } = {}) {}
  get features(): Pick<PluginRegistry, Extract<IdsOf<P>, keyof PluginRegistry>> {
    return {} as never;
  }
}

// raw id union extraction
declare function idsOf<P extends readonly AnyCtor[]>(p: P): IdsOf<P>;
const i1 = idsOf([OverlaysPlugin, StylePlugin]); const _i1: 0 = i1;
const arrVar = [OverlaysPlugin, StylePlugin];
const i2 = idsOf(arrVar);                        const _i2: 0 = i2;
const i3 = idsOf([OverlaysPlugin, StylePlugin] as const); const _i3: 0 = i3;

// the key test
const h1 = new Host({ plugins: [OverlaysPlugin] });
h1.features.overlays.addOverlay('a'); // expect OK
h1.features.style;                    // expect ERROR

const h2 = new Host({ plugins: [OverlaysPlugin, StylePlugin] });
h2.features.overlays.addOverlay('a');
h2.features.style.updateStyle('a');

const h3 = new Host();
h3.features.overlays;                 // expect ERROR (never)

const annotated: AnyCtor[] = [OverlaysPlugin];
const h4 = new Host({ plugins: annotated });
h4.features.overlays;                 // expect ERROR (collapses, as with statics)

const h5 = new Host({ plugins: [OverlaysPlugin, UnknownPlugin] });
h5.features.overlays;                 // expect OK, unknown id filtered

// reveal the exact features types
const f1 = new Host({ plugins: [OverlaysPlugin] }).features;               const _f1: 0 = f1;
const f2 = new Host({ plugins: [OverlaysPlugin, StylePlugin] }).features;  const _f2: 0 = f2;
const f3 = new Host().features;                                            const _f3: 0 = f3;
const f4 = new Host({ plugins: annotated }).features;                      const _f4: 0 = f4;

export const keep = [_i1, _i2, _i3, _f1, _f2, _f3, _f4, h5];
