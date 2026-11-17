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

// Source of the simulated published package. `generate.sh` compiles this to .d.ts
// and installs it under each app*/node_modules/my-pkg, mirroring the real published shape.
export interface PluginRegistry {}
export type RegistryKeysSeenByLib = keyof PluginRegistry;
export interface Plugin { doThing(): void }
export declare class BpmnVisualization {
  getPlugin<K extends keyof PluginRegistry>(id: K): PluginRegistry[K] | undefined;
}
