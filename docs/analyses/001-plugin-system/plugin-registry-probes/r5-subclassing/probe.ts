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

// R5: subclassing, for the static / instance / hybrid variants.

// ---------- STATIC ----------
export class SBase { static readonly pluginId = 'base'; }
export class SSubInherit extends SBase {}                          // inherits
export class SSubRedeclare extends SBase { static readonly pluginId = 'sub'; } // narrows to a different literal
export class SBaseWide { static readonly pluginId: string = 'base'; }
export class SSubWide extends SBaseWide { static readonly pluginId = 'sub'; }

declare const s1: (typeof SSubInherit)['pluginId'];   const _s1: 0 = s1;
declare const s2: (typeof SSubRedeclare)['pluginId']; const _s2: 0 = s2;
declare const s3: (typeof SSubWide)['pluginId'];      const _s3: 0 = s3;

// ---------- INSTANCE ----------
export class IBase { readonly pluginId = 'base'; }
export class ISubInherit extends IBase {}
export class ISubRedeclare extends IBase { override readonly pluginId = 'sub'; }
export class IBaseWide { readonly pluginId: string = 'base'; }
export class ISubWide extends IBaseWide { override readonly pluginId = 'sub'; }

declare const i1: ISubInherit['pluginId'];   const _i1: 0 = i1;
declare const i2: ISubRedeclare['pluginId']; const _i2: 0 = i2;
declare const i3: ISubWide['pluginId'];      const _i3: 0 = i3;

// ---------- HYBRID (static source of truth + instance readonly field) ----------
export class HBase {
  static readonly pluginId = 'base';
  readonly pluginId = HBase.pluginId;                  // hardcoded class name
}
export class HSub extends HBase { static readonly pluginId2 = 'sub'; }

// late-bound variant: instance field reads through this.constructor
export class LBase {
  static readonly pluginId: string = 'base';
  readonly pluginId = (this.constructor as typeof LBase).pluginId;
}
export class LSub extends LBase { static readonly pluginId = 'sub'; }

declare const h1: HSub['pluginId'];  const _h1: 0 = h1;
declare const l1: LSub['pluginId'];  const _l1: 0 = l1;

// does the late-bound read see the SUBCLASS static at runtime? (type-level check of the cast target)
declare const lstatic: (typeof LSub)['pluginId']; const _lstatic: 0 = lstatic;

export const keep = [_s1, _s2, _s3, _i1, _i2, _i3, _h1, _l1, _lstatic];
