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

// C1 baseline: the literal forms written straight into the plugins array, `[Plugin, config]` and
// `{ plugin, config }`, without a usePlugin call. Which typing makes TypeScript check the config against the plugin?
// Lines marked "expect OK" must produce no error; the others are measurements.

export interface Plugin { getPluginId(): string }
export interface Host { readonly n: number }
type Ctor<C = any> = new (host: Host, config?: C) => Plugin;
type ConfigOf<P> = P extends new (host: Host, config?: infer C) => Plugin ? C : never;

export class NoConfigPlugin implements Plugin {
  constructor(_host: Host) {}
  getPluginId(): string { return 'no-config'; }
}
export interface OverlaysConfig { hiddenByDefault?: boolean; maxPerElement?: number }
export class OverlaysPlugin implements Plugin {
  constructor(_host: Host, _config?: OverlaysConfig) {}
  getPluginId(): string { return 'overlays'; }
}

// 1. Plain, non-generic options interface: the shape a `GlobalOptions` augmentation allows.
export interface PlainOptions { plugins?: Array<Ctor | readonly [Ctor, unknown] | { plugin: Ctor; config?: unknown }> }
export const plain: PlainOptions = {
  plugins: [NoConfigPlugin, [OverlaysPlugin, { hiddenByDefault: 'yes' }], { plugin: OverlaysPlugin, config: { nope: 1 } }],
}; // measure: both wrong configs compile?

// 2. Registry filled by declaration merging (alternative A extended with the constructor and the config type),
// distributed into a union of valid pairs. Still non-generic.
export interface PluginRegistry { overlays: { ctor: typeof OverlaysPlugin; config: OverlaysConfig } }
type RegistryEntry = {
  [Id in keyof PluginRegistry]:
    | readonly [PluginRegistry[Id]['ctor'], PluginRegistry[Id]['config']]
    | { plugin: PluginRegistry[Id]['ctor']; config?: PluginRegistry[Id]['config'] };
}[keyof PluginRegistry];
export interface RegistryOptions { plugins?: Array<Ctor | RegistryEntry> }
export const viaRegistry: RegistryOptions = {
  plugins: [NoConfigPlugin, [OverlaysPlugin, { hiddenByDefault: 'yes' }], { plugin: OverlaysPlugin, config: { nope: 1 } }],
}; // measure: caught, and how readable is the message?

// 3. Generic: a mapped type derives each tuple's second element from its first.
type Entry = Ctor | readonly [Ctor, unknown];
type Checked<T extends readonly Entry[]> = {
  [K in keyof T]: T[K] extends readonly [infer P, unknown] ? readonly [P, ConfigOf<P>] : T[K];
};
export const definePlugins = <const T extends readonly Entry[]>(plugins: T & Checked<T>): T => plugins;
definePlugins([NoConfigPlugin, [OverlaysPlugin, { hiddenByDefault: true, maxPerElement: 1 }]]); // expect OK
definePlugins([NoConfigPlugin, [OverlaysPlugin, { hiddenByDefault: 'yes' }]]); // measure: message
definePlugins([NoConfigPlugin, [OverlaysPlugin, { nope: 1 }]]); // measure: message

export interface GenericOptions<T extends readonly Entry[]> { plugins?: T & Checked<T> }
export class GenericHost<const T extends readonly Entry[] = []> {
  constructor(_options: GenericOptions<T>) {}
}
new GenericHost({ plugins: [NoConfigPlugin, [OverlaysPlugin, { maxPerElement: 1 }]] }); // expect OK
new GenericHost({ plugins: [NoConfigPlugin, [OverlaysPlugin, { maxPerElement: 'x' }]] }); // measure

// An array prepared beforehand and annotated with the entry type loses the per-element information.
const annotated: Entry[] = [NoConfigPlugin, [OverlaysPlugin, { maxPerElement: 'x' }]];
new GenericHost({ plugins: annotated }); // measure: is the wrong config still caught?
