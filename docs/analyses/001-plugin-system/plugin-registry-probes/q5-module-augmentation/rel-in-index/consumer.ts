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

// Interface declared directly in index.ts; augment index.ts.
export interface OverlaysApi { addOverlay(id: string): void }

declare module './index.js' {
  interface PluginRegistry { overlays: OverlaysApi }
}

import type { PluginRegistry, RegistryKeysSeenByLib } from './index.js';

declare const viaBarrel: keyof PluginRegistry;
const _viaBarrel: 0 = viaBarrel;
declare const seenByLib: RegistryKeysSeenByLib;
const _seenByLib: 0 = seenByLib;
export const keep = [_viaBarrel, _seenByLib];
