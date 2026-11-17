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

// NEGATIVE CONTROL: no augmentation at all. Proves the positive results are not false positives.
import type { PluginRegistry, RegistryKeysSeenByLib } from 'my-pkg';

type IsNever<T> = [T] extends [never] ? true : false;
const _a: IsNever<keyof PluginRegistry> = false;  // errors if it IS never
const _b: IsNever<RegistryKeysSeenByLib> = false; // errors if it IS never
export const keep = [_a, _b];
