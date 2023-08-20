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

import {BpmnVisualization as BaseBpmnVisualization, type GlobalOptions as BaseGlobalOptions} from "bpmn-visualization";

export interface PluginConstructor {
    new (bpmnVisualization: BpmnVisualization, options: GlobalOptions): Plugin;
}

export interface Plugin {
    getPluginId(): string;
}

export type PluginOptionExtension = {
    plugins?: PluginConstructor[];
};

export type GlobalOptions = BaseGlobalOptions & PluginOptionExtension;

export class BpmnVisualization extends BaseBpmnVisualization {

    private readonly plugins: Record<string, Plugin> = {};

    constructor(options: GlobalOptions) {
        super(options);

        options.plugins?.forEach((constructor: PluginConstructor) => {
            const plugin = new constructor(this, options);
            this.plugins[plugin.getPluginId()] = plugin;
        });
        console.info('[bv-addons] Registered plugins:', this.plugins);
    }

    getPlugin = (id: string) => this.plugins[id] as unknown;
}

export class OverlaysPlugin implements Plugin {
    private readonly overlayPane: HTMLElement;
    private previousStyleDisplay?: string;
    private isVisible = true;

    constructor(bpmnVisualization: BpmnVisualization) {
        const view = bpmnVisualization.graph.getView();
        this.overlayPane = view.getOverlayPane() as HTMLElement;
    }

    setVisible(visible = true): void {
        if (visible && !this.isVisible) {
            this.overlayPane.style.display = this.previousStyleDisplay ?? '';
            this.isVisible = true;
        } else if (!visible && this.isVisible) {
            this.previousStyleDisplay = this.overlayPane.style.display;
            this.overlayPane.style.display = 'none';
            this.isVisible = false;
        }
    }

    getPluginId(): string {
        return 'overlays';
    }
}
