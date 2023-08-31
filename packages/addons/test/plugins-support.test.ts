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

import { describe, expect, test } from '@jest/globals';
import type { Plugin } from '../src';
import { BpmnVisualization } from '../src';

test('No error when no plugin is defined', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null! });
  expect(bpmnVisualization.getPlugin('unknown')).toBeUndefined();
});

class MyCustomPlugin1 {
  getPluginId(): string {
    return 'custom-plugin-1';
  }
  doSomethingSpecial(): number {
    return 5;
  }
}

test('Load a plugin and use it', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null!, plugins: [MyCustomPlugin1] });
  const plugin = bpmnVisualization.getPlugin('custom-plugin-1') as MyCustomPlugin1;
  expect(plugin).toBeInstanceOf(MyCustomPlugin1);
  expect(plugin.doSomethingSpecial()).toBe(5);
});

class MyCustomPlugin2 {
  getPluginId(): string {
    return 'custom-plugin-2';
  }
  doSomethingSpecial(): string {
    return 'I am awesome';
  }
}

test('Load several plugins and use them', () => {
  const bpmnVisualization = new BpmnVisualization({ container: null!, plugins: [MyCustomPlugin2, MyCustomPlugin1] });
  const plugin1 = bpmnVisualization.getPlugin('custom-plugin-1');
  expect(plugin1).toBeInstanceOf(MyCustomPlugin1);

  const plugin2 = bpmnVisualization.getPlugin('custom-plugin-2') as MyCustomPlugin2;
  expect(plugin2).toBeInstanceOf(MyCustomPlugin2);
  expect(plugin2.doSomethingSpecial()).toBe('I am awesome');
});

describe('Prevent multiple plugins with the same ID from loading', () => {
  test('Load the same plugin twice', () => {
    expect(() => new BpmnVisualization({ container: null!, plugins: [MyCustomPlugin1, MyCustomPlugin1] })).toThrow(
      "Plugin loading fails. It is not possible to register multiple plugins with the same 'custom-plugin-1' identifier.",
    );
  });

  test('Load 2 plugins with the same id', () => {
    class MyCustomPluginWithSameId implements Plugin {
      getPluginId(): string {
        return 'custom-plugin-1';
      }
      doThings(): { prop: string } {
        return { prop: 'alpha' };
      }
    }
    expect(() => new BpmnVisualization({ container: null!, plugins: [MyCustomPluginWithSameId, MyCustomPlugin1] })).toThrow(
      "Plugin loading fails. It is not possible to register multiple plugins with the same 'custom-plugin-1' identifier.",
    );
  });

  test('Load 2 plugins with the same id - one extending the other', () => {
    class MyCustomPlugin2SubClass extends MyCustomPlugin2 {
      doAnotherThing(): string {
        return 'this is the end';
      }
    }
    expect(() => new BpmnVisualization({ container: null!, plugins: [MyCustomPlugin2, MyCustomPlugin2SubClass] })).toThrow(
      "Plugin loading fails. It is not possible to register multiple plugins with the same 'custom-plugin-2' identifier.",
    );
  });
});
