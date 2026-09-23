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

// Q6: overload ordering between a registry-typed overload and a loose one.
export interface OverlaysApi { addOverlay(id: string): void }
export interface StyleApi { updateStyle(id: string): void }
export interface PluginRegistry { overlays: OverlaysApi; style: StyleApi }
export interface Plugin { doThing(): void }
export class SomePlugin implements Plugin { doThing(): void {} }

// (A) typed overload FIRST
export class HostA {
  getPlugin<K extends keyof PluginRegistry>(id: K): PluginRegistry[K] | undefined;
  getPlugin<T extends Plugin>(id: string): T | undefined;
  getPlugin(_id: string): unknown { return undefined; }
}
// (B) loose overload FIRST
export class HostB {
  getPlugin<T extends Plugin>(id: string): T | undefined;
  getPlugin<K extends keyof PluginRegistry>(id: K): PluginRegistry[K] | undefined;
  getPlugin(_id: string): unknown { return undefined; }
}
// (C) typed overload ONLY
export class HostC {
  getPlugin<K extends keyof PluginRegistry>(_id: K): PluginRegistry[K] | undefined { return undefined; }
}

declare const a: HostA;
declare const b: HostB;
declare const c: HostC;

const a1 = a.getPlugin('overlays');       const _a1: 0 = a1;
const a2 = a.getPlugin('typo');           const _a2: 0 = a2;   // does the loose overload swallow it?
const a3 = a.getPlugin<SomePlugin>('x');  const _a3: 0 = a3;   // explicit type arg, non-registry id
declare const dyn: string;
const a4 = a.getPlugin(dyn);              const _a4: 0 = a4;   // dynamic string id

const b1 = b.getPlugin('overlays');       const _b1: 0 = b1;
const b2 = b.getPlugin('typo');           const _b2: 0 = b2;
const b3 = b.getPlugin<SomePlugin>('x');  const _b3: 0 = b3;

const c1 = c.getPlugin('overlays');       const _c1: 0 = c1;
const c2 = c.getPlugin('typo');           const _c2: 0 = c2;   // expect a real error on the ARGUMENT

export const keep = [_a1, _a2, _a3, _a4, _b1, _b2, _b3, _c1, _c2];
