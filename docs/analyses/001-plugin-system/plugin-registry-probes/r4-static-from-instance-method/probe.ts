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

// R4: reading a STATIC id from inside an instance method.
export interface Host { readonly n: number }
export interface Plugin { doThing(): void }
export interface PluginConstructor { readonly pluginId: string; new (h: Host): Plugin }

export class OverlaysPlugin implements Plugin {
  static readonly pluginId = 'overlays';
  constructor(_h: Host) {}
  doThing(): void {}

  // (0) no cast at all
  raw() { return this.constructor.pluginId; }

  // what is `this.constructor` typed as?
  ctorType() { const c = this.constructor; const _c: 0 = c; return _c; }

  // (1) hardcoded class name
  viaClassName() { const v = OverlaysPlugin.pluginId; const _v: 0 = v; return _v; }

  // (2) cast to typeof the class
  viaTypeofSelf() { const v = (this.constructor as typeof OverlaysPlugin).pluginId; const _v: 0 = v; return _v; }

  // (3) cast to the constructor interface
  viaCtorInterface() { const v = (this.constructor as PluginConstructor).pluginId; const _v: 0 = v; return _v; }
}

// ---- hybrid: static readonly is the source of truth, instance member delegates ----
export class HybridInferred implements Plugin {
  static readonly pluginId = 'overlays';
  get pluginId() { return HybridInferred.pluginId; } // inferred getter return type
  constructor(_h: Host) {}
  doThing(): void {}
}
export class HybridAnnotated implements Plugin {
  static readonly pluginId = 'overlays';
  get pluginId(): typeof HybridAnnotated.pluginId { return HybridAnnotated.pluginId; }
  constructor(_h: Host) {}
  doThing(): void {}
}
export class HybridReadonlyField implements Plugin {
  static readonly pluginId = 'overlays';
  readonly pluginId = HybridReadonlyField.pluginId; // plain readonly field, not a getter
  constructor(_h: Host) {}
  doThing(): void {}
}

declare const hi: HybridInferred['pluginId'];
declare const ha: HybridAnnotated['pluginId'];
declare const hf: HybridReadonlyField['pluginId'];
const _hi: 0 = hi;
const _ha: 0 = ha;
const _hf: 0 = hf;

// static side of the hybrids still usable pre-construction
declare const shi: (typeof HybridInferred)['pluginId'];
const _shi: 0 = shi;

export const keep = [_hi, _ha, _hf, _shi];
