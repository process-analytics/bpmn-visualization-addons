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

// R1: literal preservation on the INSTANCE side.
export class A { readonly pluginId = 'overlays'; }
export class B { pluginId = 'overlays'; }
export class C { readonly pluginId: string = 'overlays'; }
export class D { readonly pluginId = 'overlays' as const; }
export class E { get pluginId() { return 'overlays'; } }              // getter, inferred
export class F { get pluginId(): 'overlays' { return 'overlays'; } }  // getter, annotated

declare const a: A['pluginId'];
declare const b: B['pluginId'];
declare const c: C['pluginId'];
declare const d: D['pluginId'];
declare const e: E['pluginId'];
declare const f: F['pluginId'];

const _a: 0 = a;
const _b: 0 = b;
const _c: 0 = c;
const _d: 0 = d;
const _e: 0 = e;
const _f: 0 = f;

// constructor-parameter-property forms (common when the id comes from options)
export class G { constructor(public readonly pluginId = 'overlays') {} }
export class H { constructor(readonly pluginId: string = 'overlays') {} }
declare const g: G['pluginId'];
declare const h: H['pluginId'];
const _g: 0 = g;
const _h: 0 = h;

export const keep = [_a, _b, _c, _d, _e, _f, _g, _h];
