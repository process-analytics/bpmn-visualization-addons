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

// Augment the SUBPATH specifier (the declaring module) via the package name.
export interface OverlaysApi { addOverlay(id: string): void }

declare module 'my-pkg/lib/plugins-support.js' {
  interface PluginRegistry { overlays: OverlaysApi }
}

import type { PluginRegistry, RegistryKeysSeenByLib } from 'my-pkg';

declare const viaRoot: keyof PluginRegistry;
const _viaRoot: 0 = viaRoot;
declare const seenByLib: RegistryKeysSeenByLib;
const _seenByLib: 0 = seenByLib;
export const keep = [_viaRoot, _seenByLib];
