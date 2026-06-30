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

import type { Plugin } from '../../src/index.js';
import type { GlobalOptions } from 'bpmn-visualization';

import { describe, expect, jest, test } from '@jest/globals';

import { BpmnVisualization } from '../../src/index.js';
import { createNewBpmnVisualizationWithoutContainer } from '../shared/bv-utilities.js';
import { insertBpmnContainerWithoutId } from '../shared/dom-utilities.js';
import { readFileSync } from '../shared/io-utilities.js';

test('No error when no plugin is defined', () => {
  const bpmnVisualization = createNewBpmnVisualizationWithoutContainer();
  expect(bpmnVisualization.getPlugin('unknown')).toBeUndefined();
});

class MyCustomPlugin1 implements Plugin {
  getPluginId(): string {
    return 'custom-plugin-1';
  }
  doSomethingSpecial(): number {
    return 5;
  }
}

test('Load a typed plugin and use it', () => {
  const bpmnVisualization = new BpmnVisualization({ container: undefined!, plugins: [MyCustomPlugin1] });
  const plugin = bpmnVisualization.getPlugin<MyCustomPlugin1>('custom-plugin-1');
  expect(plugin).toBeInstanceOf(MyCustomPlugin1);
  expect(plugin.doSomethingSpecial()).toBe(5);
});

test('Load a untyped plugin and use it', () => {
  const bpmnVisualization = new BpmnVisualization({ container: undefined!, plugins: [MyCustomPlugin1] });
  const plugin = bpmnVisualization.getPlugin('custom-plugin-1');
  expect(plugin).toBeInstanceOf(MyCustomPlugin1);
  expect(plugin.getPluginId()).toBe('custom-plugin-1');
  expect((plugin as MyCustomPlugin1).doSomethingSpecial()).toBe(5);
});

class MyCustomPlugin2 implements Plugin {
  getPluginId(): string {
    return 'custom-plugin-2';
  }
  doSomethingSpecial(): string {
    return 'I am awesome';
  }
}

test('Load several plugins and use them', () => {
  const bpmnVisualization = new BpmnVisualization({ container: undefined!, plugins: [MyCustomPlugin2, MyCustomPlugin1] });
  const plugin1 = bpmnVisualization.getPlugin('custom-plugin-1');
  expect(plugin1).toBeInstanceOf(MyCustomPlugin1);

  const plugin2 = bpmnVisualization.getPlugin<MyCustomPlugin2>('custom-plugin-2');
  expect(plugin2).toBeInstanceOf(MyCustomPlugin2);
  expect(plugin2.doSomethingSpecial()).toBe('I am awesome');
});

describe('Prevent multiple plugins with the same ID from loading', () => {
  test('Load the same plugin twice', () => {
    expect(() => new BpmnVisualization({ container: undefined!, plugins: [MyCustomPlugin1, MyCustomPlugin1] })).toThrow(
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
    expect(() => new BpmnVisualization({ container: undefined!, plugins: [MyCustomPluginWithSameId, MyCustomPlugin1] })).toThrow(
      "Plugin loading fails. It is not possible to register multiple plugins with the same 'custom-plugin-1' identifier.",
    );
  });

  test('Load 2 plugins with the same id - one extending the other', () => {
    class MyCustomPlugin2SubClass extends MyCustomPlugin2 {
      doAnotherThing(): string {
        return 'this is the end';
      }
    }
    expect(() => new BpmnVisualization({ container: undefined!, plugins: [MyCustomPlugin2, MyCustomPlugin2SubClass] })).toThrow(
      "Plugin loading fails. It is not possible to register multiple plugins with the same 'custom-plugin-2' identifier.",
    );
  });
});

describe('Ensure that plugins are configured', () => {
  // Use a local intersection type instead of module augmentation of GlobalOptions: augmentation is global, so it would
  // leak the custom property to all tests and risk side effects. In application code, module augmentation is the
  // recommended way to pass custom properties to a plugin (see the README).
  type CustomGlobalOptions = GlobalOptions & {
    customValue?: string;
  };
  class ConfigurablePlugin implements Plugin {
    #isConfigured = false;
    #customValue = 'not configured';

    get isConfigured(): boolean {
      return this.#isConfigured;
    }
    get customValue(): string {
      return this.#customValue;
    }

    onConfigure(options: CustomGlobalOptions): void {
      this.#isConfigured = true;
      this.#customValue = options.customValue ?? 'no passed in options';
    }

    getPluginId(): string {
      return 'custom-configurable-plugin';
    }
  }

  test('Check the properties of the configurable plugin after construction', () => {
    const configurablePlugin = new ConfigurablePlugin();
    expect(configurablePlugin.isConfigured).toBeFalsy();
    expect(configurablePlugin.customValue).toBe('not configured');
  });

  test('Ensure that the configurable plugin is configured after BpmnVisualization initialization', () => {
    const bpmnVisualization = new BpmnVisualization({ container: undefined!, customValue: 'custom in options', plugins: [ConfigurablePlugin] } as CustomGlobalOptions);
    const configurablePlugin = bpmnVisualization.getPlugin<ConfigurablePlugin>('custom-configurable-plugin');
    expect(configurablePlugin.isConfigured).toBeTruthy();
    expect(configurablePlugin.customValue).toBe('custom in options'); // ensure that the options are passed to the plugin configuration
  });
});

/**
 * A plugin that implements none of the optional lifecycle methods. It is used in the tests checking that no error
 * occurs when a registered plugin doesn't implement the optional method involved in a given lifecycle step.
 */
class PluginWithoutOptionalMethods implements Plugin {
  getPluginId(): string {
    return 'custom-plugin-without-optional-methods';
  }
}

describe('Ensure that plugins are disposed', () => {
  class DisposablePlugin1 implements Plugin {
    onDispose = jest.fn();

    getPluginId(): string {
      return 'custom-disposable-plugin-1';
    }
  }

  class DisposablePlugin2 implements Plugin {
    onDispose = jest.fn();

    getPluginId(): string {
      return 'custom-disposable-plugin-2';
    }
  }

  test('Call onDispose on plugins that implement it and ignore the others when disposing BpmnVisualization', () => {
    const bpmnVisualization = new BpmnVisualization({ container: undefined!, plugins: [DisposablePlugin1, PluginWithoutOptionalMethods, DisposablePlugin2] });
    const disposablePlugin1 = bpmnVisualization.getPlugin<DisposablePlugin1>('custom-disposable-plugin-1');
    const disposablePlugin2 = bpmnVisualization.getPlugin<DisposablePlugin2>('custom-disposable-plugin-2');

    expect(() => bpmnVisualization.dispose()).not.toThrow();
    expect(disposablePlugin1.onDispose).toHaveBeenCalledTimes(1);
    expect(disposablePlugin2.onDispose).toHaveBeenCalledTimes(1);
  });
});

class LoadAwarePlugin1 implements Plugin {
  onBeforeLoad = jest.fn();
  onLoadSuccess = jest.fn();
  onLoadError = jest.fn();

  getPluginId(): string {
    return 'custom-load-aware-plugin-1';
  }
}

class LoadAwarePlugin2 implements Plugin {
  onBeforeLoad = jest.fn();
  onLoadSuccess = jest.fn();
  onLoadError = jest.fn();

  getPluginId(): string {
    return 'custom-load-aware-plugin-2';
  }
}

const validBpmnContent = readFileSync('./fixtures/bpmn/search-elements.bpmn');
const invalidBpmnContent = 'this is not valid BPMN content';

const setupLoadAwareVisualization = (): { bpmnVisualization: BpmnVisualization; loadAwarePlugin1: LoadAwarePlugin1; loadAwarePlugin2: LoadAwarePlugin2 } => {
  const bpmnVisualization = new BpmnVisualization({ container: insertBpmnContainerWithoutId(), plugins: [LoadAwarePlugin1, PluginWithoutOptionalMethods, LoadAwarePlugin2] });
  return {
    bpmnVisualization,
    loadAwarePlugin1: bpmnVisualization.getPlugin<LoadAwarePlugin1>('custom-load-aware-plugin-1'),
    loadAwarePlugin2: bpmnVisualization.getPlugin<LoadAwarePlugin2>('custom-load-aware-plugin-2'),
  };
};

describe('Ensure that plugins are notified before load', () => {
  test('Call onBeforeLoad on plugins that implement it and ignore the others when loading with BpmnVisualization', () => {
    const { bpmnVisualization, loadAwarePlugin1, loadAwarePlugin2 } = setupLoadAwareVisualization();

    expect(() => bpmnVisualization.load(validBpmnContent)).not.toThrow();
    expect(loadAwarePlugin1.onBeforeLoad).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin2.onBeforeLoad).toHaveBeenCalledTimes(1);
  });
});

describe('Ensure that plugins are notified on load success', () => {
  test('Call onLoadSuccess on plugins that implement it and ignore the others when loading with BpmnVisualization', () => {
    const { bpmnVisualization, loadAwarePlugin1, loadAwarePlugin2 } = setupLoadAwareVisualization();

    expect(() => bpmnVisualization.load(validBpmnContent)).not.toThrow();
    expect(loadAwarePlugin1.onLoadSuccess).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin2.onLoadSuccess).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin1.onLoadError).not.toHaveBeenCalled();
    expect(loadAwarePlugin2.onLoadError).not.toHaveBeenCalled();
  });
});

describe('Ensure that plugins are notified on load error', () => {
  test('Call onLoadError on plugins that implement it, rethrow and skip onLoadSuccess when loading fails', () => {
    const { bpmnVisualization, loadAwarePlugin1, loadAwarePlugin2 } = setupLoadAwareVisualization();

    expect(() => bpmnVisualization.load(invalidBpmnContent)).toThrow();
    expect(loadAwarePlugin1.onBeforeLoad).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin2.onBeforeLoad).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin1.onLoadError).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin2.onLoadError).toHaveBeenCalledTimes(1);
    expect(loadAwarePlugin1.onLoadSuccess).not.toHaveBeenCalled();
    expect(loadAwarePlugin2.onLoadSuccess).not.toHaveBeenCalled();
  });
});
