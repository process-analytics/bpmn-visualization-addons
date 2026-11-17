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

// Q3c: expand `Extract` over the widening idiom, without the type-alias display name.
import { type PluginId } from './probe.js';

interface Registry { overlays: { o: 1 }; style: { s: 2 } }
declare const looked: Extract<PluginId, keyof Registry>;
const _looked: 0 = looked;
declare const picked: keyof Pick<Registry, Extract<PluginId, keyof Registry>>;
const _picked: 0 = picked;
export const keep = [_looked, _picked];
