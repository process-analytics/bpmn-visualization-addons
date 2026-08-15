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

// Q1: static id field forms vs instance method, for type-level access.
// Each `const _n: 0 = ...` deliberately fails; the error text reveals the inferred type.

export class A { static readonly pluginId = 'overlays'; }
export class B { static pluginId = 'overlays'; }
export class C { static readonly pluginId: string = 'overlays'; }
export class D { static readonly pluginId = 'overlays' as const; }

declare const a: (typeof A)['pluginId'];
declare const b: (typeof B)['pluginId'];
declare const c: (typeof C)['pluginId'];
declare const d: (typeof D)['pluginId'];

const _a: 0 = a; // A: static readonly x = 'overlays'
const _b: 0 = b; // B: static x = 'overlays'
const _c: 0 = c; // C: static readonly x: string = 'overlays'
const _d: 0 = d; // D: static readonly x = 'overlays' as const

// instance method form
export class E { getPluginId(): string { return 'overlays'; } }
declare const e: ReturnType<E['getPluginId']>;
const _e: 0 = e; // E: instance method return type

// can we get an id from E without an instance?
type EIdFromType = (typeof E)['pluginId'];

export const keep = [_a, _b, _c, _d, _e];
export type Keep = EIdFromType;
