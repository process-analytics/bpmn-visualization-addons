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

export interface PluginRegistry {}
export interface Plugin { doThing(): void }
export interface HostLike { readonly n: number }
export interface PluginCtor { readonly pluginId: string; new (h: HostLike): Plugin }
export declare class BpmnVisualization<P extends readonly PluginCtor[] = []> {
  constructor(options?: { plugins?: P });
  getPlugin<K extends keyof PluginRegistry | (string & Record<never, never>)>(
    id: K,
  ): (K extends keyof PluginRegistry ? PluginRegistry[K] : Plugin) | undefined;
  readonly features: Pick<PluginRegistry, Extract<P[number]['pluginId'], keyof PluginRegistry>>;
}
