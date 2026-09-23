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

// Composition check: generic host + conditional getPlugin signature + registry augmented
// through the barrel by a third party, all at once.
import { BpmnVisualization, type Plugin, type HostLike } from './src/index.js';

export interface OverlaysApi { addOverlay(id: string): void }
declare module './src/index.js' {
  interface PluginRegistry { overlays: OverlaysApi }
}

export class OverlaysPlugin implements Plugin, OverlaysApi {
  static readonly pluginId = 'overlays';
  constructor(_h: HostLike) {}
  doThing(): void {}
  addOverlay(_id: string): void {}
}
export class OtherPlugin implements Plugin {
  static readonly pluginId = 'other';
  constructor(_h: HostLike) {}
  doThing(): void {}
}

const v = new BpmnVisualization({ plugins: [OverlaysPlugin] });
v.features.overlays.addOverlay('a'); // expect OK
const g = v.getPlugin('overlays');   // expect OverlaysApi | undefined
const _g: 0 = g;

const w = new BpmnVisualization({ plugins: [OtherPlugin] });
w.features.overlays;                 // expect ERROR: not loaded

// backwards compatibility: using the class name with no type argument
declare const legacy: BpmnVisualization;
legacy.getPlugin('overlays');
export const keep = [_g, legacy, w];
