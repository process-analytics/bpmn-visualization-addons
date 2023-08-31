/*
Copyright 2023 Bonitasoft S.A.

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

import { expect, test } from '@jest/globals';
import { BpmnVisualization } from '../dist';

test('No error when no plugin is defined', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null });
  expect(bpmnVisualization.getPlugin('unknown')).toBeUndefined();
});

class MyCustomPlugin {
  getPluginId() {
    return 'custom-plugin';
  }
  doSomethingSpecial() {
    return 5;
  }
}

test('Load a plugin and retrieve it', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null, plugins: [MyCustomPlugin] });
  const plugin = bpmnVisualization.getPlugin('custom-plugin');
  expect(plugin).toBeDefined();
  expect(plugin.doSomethingSpecial()).toBe(5);
});
