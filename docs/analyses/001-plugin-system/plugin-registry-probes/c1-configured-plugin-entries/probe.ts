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

// C1: a `usePlugin(plugin, config?)` helper returning a `{ plugin, config }` descriptor, accepted next to bare
// constructors in a NON-generic options interface (the shape a `GlobalOptions` augmentation allows).
// Lines marked "expect OK" must produce no error; lines marked "expect error" must produce one.

export interface Plugin { getPluginId(): string }

export class Host {
  constructor(options: Options) { this.registerPlugins(options); }

  // C1.9 the runtime side: one branch, no cast
  private registerPlugins(options: Options): void {
    for (const entry of options.plugins ?? []) {
      const { plugin: constructor, config } = typeof entry === 'function' ? { plugin: entry, config: undefined } : entry;
      new constructor(this, config).getPluginId();
    }
  }

  // C1.10 the runtime-loading counterpart reuses the same signature
  loadPlugin<P extends PluginConstructor>(plugin: P, config?: ConfigOf<P>): void {
    this.registerPlugins({ plugins: [usePlugin(plugin, config)] });
  }
}

export type PluginConstructor = new (host: Host, config?: any) => Plugin;
export type ConfigOf<P> = P extends new (host: Host, config?: infer C) => Plugin ? C : never;

export interface ConfiguredPlugin<C = unknown> {
  readonly plugin: new (host: Host, config?: C) => Plugin;
  readonly config?: C;
}

export const usePlugin = <P extends PluginConstructor>(plugin: P, config?: ConfigOf<P>): ConfiguredPlugin<ConfigOf<P>> =>
  ({ plugin, config });

export interface Options {
  plugins?: Array<PluginConstructor | ConfiguredPlugin<any>>;
}

// --- plugins under test ---
export class NoConfigPlugin implements Plugin {
  constructor(_host: Host) {}
  getPluginId(): string { return 'no-config'; }
}

export interface OverlaysConfig { hiddenByDefault?: boolean; maxPerElement?: number }
export class OverlaysPlugin implements Plugin {
  constructor(_host: Host, _config?: OverlaysConfig) {}
  getPluginId(): string { return 'overlays'; }
}

export interface RequiredConfig { url: string }
export class RequiredConfigPlugin implements Plugin {
  constructor(_host: Host, _config: RequiredConfig) {}
  getPluginId(): string { return 'required'; }
}

declare const host: Host;

// C1.1 correct config
new Host({ plugins: [NoConfigPlugin, usePlugin(OverlaysPlugin, { hiddenByDefault: true, maxPerElement: 3 })] }); // expect OK

// C1.2 wrong value type: is the message precise?
new Host({ plugins: [usePlugin(OverlaysPlugin, { hiddenByDefault: 'yes' })] }); // expect error

// C1.3 unknown key: does the excess property check fire through the generic?
new Host({ plugins: [usePlugin(OverlaysPlugin, { hiddenByDefaut: true })] }); // expect error

// C1.4 config passed to a plugin whose constructor takes none
new Host({ plugins: [usePlugin(NoConfigPlugin, { anything: 1 })] }); // measure: error or silently accepted?
declare const c14: ConfigOf<typeof NoConfigPlugin>;
const _c14: 0 = c14; // reveals ConfigOf for a one-parameter constructor

// C1.5 required config omitted
new Host({ plugins: [usePlugin(RequiredConfigPlugin)] }); // measure: error or silently accepted?
new Host({ plugins: [RequiredConfigPlugin] });           // measure: bare constructor needing a config

// C1.6 descriptor written by hand (config from JSON, for instance)
new Host({ plugins: [{ plugin: OverlaysPlugin, config: { hiddenByDefault: 'yes' } }] }); // measure: checked or not?

// C1.7 array built beforehand and annotated with the entry type
const entries: Options['plugins'] = [NoConfigPlugin, usePlugin(OverlaysPlugin, { maxPerElement: 'x' })]; // expect error
new Host({ plugins: entries }); // expect OK

// C1.8 the descriptor keeps the precise config type
const configured = usePlugin(OverlaysPlugin, { hiddenByDefault: true });
const _c18: 0 = configured; // reveals the return type

// C1.10 runtime loading
host.loadPlugin(OverlaysPlugin, { maxPerElement: 2 });   // expect OK
host.loadPlugin(OverlaysPlugin, { maxPerElement: '2' }); // expect error
