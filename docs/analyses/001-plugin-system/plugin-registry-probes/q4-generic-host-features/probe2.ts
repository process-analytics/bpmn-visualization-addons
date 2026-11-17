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

// Q4b: reveal the exact inferred `features` type in each shape.
import { Host, OverlaysPlugin, StylePlugin, UnknownPlugin, type PluginCtor } from './probe.js';

declare const flag: boolean;

const f1 = new Host({ plugins: [OverlaysPlugin] }).features;            const _1: 0 = f1;
const f2 = new Host({ plugins: [OverlaysPlugin, StylePlugin] }).features; const _2: 0 = f2;
const f3 = new Host().features;                                          const _3: 0 = f3;
const pv = [OverlaysPlugin]; const f5 = new Host({ plugins: pv }).features; const _5: 0 = f5;
const pc = [OverlaysPlugin] as const; const f6 = new Host({ plugins: pc }).features; const _6: 0 = f6;
const pa: PluginCtor[] = [OverlaysPlugin]; const f7 = new Host({ plugins: pa }).features; const _7: 0 = f7;
const f8 = new Host({ plugins: [OverlaysPlugin, ...(flag ? [StylePlugin] : [])] }).features; const _8: 0 = f8;
const f9 = new Host({ plugins: flag ? [OverlaysPlugin, StylePlugin] : [OverlaysPlugin] }).features; const _9: 0 = f9;
const f10 = new Host({ plugins: [OverlaysPlugin, UnknownPlugin] }).features; const _10: 0 = f10;
export const keep = [_1, _2, _3, _5, _6, _7, _8, _9, _10];
