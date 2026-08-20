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

// Q6b: single conditional signature instead of overloads (keeps autocomplete + accepts unknown ids).
import type { PluginRegistry, Plugin } from './probe.js';

export class HostD {
  getPlugin<K extends keyof PluginRegistry | (string & Record<never, never>)>(
    _id: K,
  ): (K extends keyof PluginRegistry ? PluginRegistry[K] : Plugin) | undefined {
    return undefined;
  }
}
declare const d: HostD;
const d1 = d.getPlugin('overlays'); const _d1: 0 = d1;
const d2 = d.getPlugin('typo');     const _d2: 0 = d2;
declare const dyn: string;
const d3 = d.getPlugin(dyn);        const _d3: 0 = d3;
export const keep = [_d1, _d2, _d3];
