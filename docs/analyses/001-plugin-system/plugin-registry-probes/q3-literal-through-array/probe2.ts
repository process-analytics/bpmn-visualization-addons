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

// Q3b: nail down the `plugins` omitted case, and the widening-idiom variants.
import { HostB, OverlaysPlugin, type PluginId } from './probe.js';

type IsNever<T> = [T] extends [never] ? true : false;

const omitted = new HostB({}).ids;
type Omitted = typeof omitted;
const _isNever: IsNever<Omitted> = false; // errors if Omitted IS never

// exact-literal check for the widening idiom
declare const w: PluginId;
type IsExactOverlays<T> = 'overlays' extends T ? (T extends 'overlays' ? true : false) : false;
const _exact: IsExactOverlays<PluginId> = false; // errors if PluginId is exactly 'overlays'

// does PluginId still allow narrowing / keyof lookup?
interface Registry { overlays: { o: 1 }; style: { s: 2 } }
type Looked = Extract<PluginId, keyof Registry>;
declare const looked: Looked;
const _looked: 0 = looked;

const single = new HostB({ plugins: [OverlaysPlugin] }).ids;
const _single: 0 = single;

export const keep = [omitted, w, _isNever, _exact, _looked, _single];
