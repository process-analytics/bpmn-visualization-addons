/*
Copyright 2024 Bonitasoft S.A.

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

// This is simple example of the BPMN diagram, loaded from a URL. The '?.url' extension support is provided by Vite.
// See https://vitejs.dev/guide/assets#importing-asset-as-url
// For other load methods, see https://github.com/process-analytics/bpmn-visualization-examples
import diagramUrl from '../assets/bpmn/EC-purchase-orders-collapsed.xml?url';

export async function fetchDiagram(): Promise<string> {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(diagramUrl);
  return await response.text();
}
