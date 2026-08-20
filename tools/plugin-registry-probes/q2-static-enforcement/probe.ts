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

// Q2: does a constructor-typed interface enforce the static member, and where?
export interface Host { readonly name: string }
export interface Plugin { doThing(): void }
export interface PluginConstructor { pluginId: string; new (host: Host): Plugin }

// (a) implements only checks the instance side -> expect NO error here
export class P implements Plugin {
  constructor(_host: Host) {}
  doThing(): void {}
}

// (b) error when placed in a PluginConstructor[]
export const arr: PluginConstructor[] = [P];

// (c) error when passed where PluginConstructor is expected
export function take(_c: PluginConstructor): void {}
take(P);

// (d) satisfies at the declaration site (expression statement right after the class)
export class Q implements Plugin {
  constructor(_host: Host) {}
  doThing(): void {}
}
Q satisfies PluginConstructor;

// (e) helper function
export const definePlugin = <T extends PluginConstructor>(ctor: T): T => ctor;
export const R = definePlugin(
  class R implements Plugin {
    constructor(_host: Host) {}
    doThing(): void {}
  },
);

// (f) static initialization block self-check
export class S implements Plugin {
  constructor(_host: Host) {}
  doThing(): void {}
  static {
    S satisfies PluginConstructor;
  }
}

// (g) the correct class, for contrast: no error expected anywhere
export class T implements Plugin {
  static pluginId = 'ok';
  constructor(_host: Host) {}
  doThing(): void {}
}
T satisfies PluginConstructor;
export const okArr: PluginConstructor[] = [T];
