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

// C1 corrected: probe.ts showed that `config?: infer C` yields `unknown` for a constructor without a config
// parameter (so any config is silently accepted) and `never` for a REQUIRED config parameter (so the plugin cannot be
// used at all). Here the config parameters are read as a rest tuple, which keeps "absent", "optional" and "required".

export interface Plugin { getPluginId(): string }

/** What follows the host in the constructor: `[]`, `[config?: C]` or `[config: C]`. */
export type ConfigArgs<P> = P extends new (host: Host, ...args: infer A) => Plugin ? A : never;

/** A bare entry must be constructible with the host alone, so a plugin requiring a config is rejected. */
export type BarePluginConstructor = new (host: Host) => Plugin;

export interface ConfiguredPlugin<C = unknown> {
  readonly plugin: new (host: Host, config: C) => Plugin;
  readonly config: C;
}

export const usePlugin = <P extends new (host: Host, ...args: any[]) => Plugin>(
  plugin: P,
  ...config: ConfigArgs<P>
): ConfiguredPlugin<ConfigArgs<P>[0]> => ({ plugin, config: config[0] }) as ConfiguredPlugin<ConfigArgs<P>[0]>;

export interface Options {
  plugins?: Array<BarePluginConstructor | ConfiguredPlugin<any>>;
}

export class Host {
  constructor(options: Options) { this.registerPlugins(options); }

  private registerPlugins(options: Options): void {
    for (const entry of options.plugins ?? []) {
      const { plugin: constructor, config } = typeof entry === 'function' ? { plugin: entry, config: undefined } : entry;
      new constructor(this, config).getPluginId();
    }
  }

  loadPlugin<P extends new (host: Host, ...args: any[]) => Plugin>(plugin: P, ...config: ConfigArgs<P>): void {
    this.registerPlugins({ plugins: [usePlugin(plugin, ...config)] });
  }
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

new Host({ plugins: [NoConfigPlugin, OverlaysPlugin, usePlugin(OverlaysPlugin, { hiddenByDefault: true })] }); // expect OK
new Host({ plugins: [usePlugin(OverlaysPlugin)] });                                // expect OK, config is optional
new Host({ plugins: [usePlugin(OverlaysPlugin, { hiddenByDefault: 'yes' })] });    // expect error, precise
new Host({ plugins: [usePlugin(OverlaysPlugin, { hiddenByDefaut: true })] });      // expect error, did you mean
new Host({ plugins: [usePlugin(NoConfigPlugin, { anything: 1 })] });               // expect error, no config expected
new Host({ plugins: [usePlugin(NoConfigPlugin)] });                                // expect OK
new Host({ plugins: [usePlugin(RequiredConfigPlugin, { url: 'https://x' })] });    // expect OK
new Host({ plugins: [usePlugin(RequiredConfigPlugin)] });                          // expect error, config required
new Host({ plugins: [RequiredConfigPlugin] });                                     // expect error, bare but needs config
new Host({ plugins: [{ plugin: OverlaysPlugin, config: { hiddenByDefault: 'yes' } }] }); // measure: hand-written
host.loadPlugin(RequiredConfigPlugin, { url: 'x' });                               // expect OK
host.loadPlugin(RequiredConfigPlugin);                                             // expect error
const _c: 0 = usePlugin(OverlaysPlugin, {});                                       // reveals the return type
