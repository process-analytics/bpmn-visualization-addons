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

// The augmentation lives in its own module which the consumer NEVER imports.
// It is only part of the program because tsconfig `include` picks it up.
export interface OverlaysApi { addOverlay(id: string): void }

declare module 'my-pkg' {
  interface PluginRegistry { overlays: OverlaysApi }
}
