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

// R3: does `implements` catch a MISSING instance pluginId at the class declaration?
export interface Plugin { readonly pluginId: string; onDispose?(): void }

// (a) missing entirely -> expect error ON the class declaration line
export class Missing implements Plugin {
  doThing(): void {}
}

// (b) present -> no error
export class Present implements Plugin {
  readonly pluginId = 'overlays';
}

// (c) wrong type -> expect error, and on the member itself
export class WrongType implements Plugin {
  readonly pluginId = 42;
}

// (d) contrast: the STATIC variant, same missing member
export interface StaticPlugin { doThing(): void }
export interface StaticPluginCtor { readonly pluginId: string; new (): StaticPlugin }
export class MissingStatic implements StaticPlugin {
  doThing(): void {}
}
// silent above; only the use site complains:
export const registry: StaticPluginCtor[] = [MissingStatic];

// (e) optional method typo is NOT caught by implements (excess member is allowed)
export class TypoMethod implements Plugin {
  readonly pluginId = 'x';
  onDispsoe(): void {}
}
