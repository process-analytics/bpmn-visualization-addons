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

import type { BpmnVisualization, Plugin } from '../plugins-support';
import type { Overlay, OverlaysRegistry } from 'bpmn-visualization';

export class OverlaysPlugin implements Plugin, OverlaysRegistry {
  private readonly overlayPane: HTMLElement;
  private readonly overlaysRegistry: OverlaysRegistry;
  private previousStyleDisplay?: string;
  private isVisible = true;

  constructor(bpmnVisualization: BpmnVisualization) {
    const view = bpmnVisualization.graph.getView();
    this.overlayPane = view.getOverlayPane() as HTMLElement;
    this.overlaysRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  setVisible(visible = true): void {
    if (visible && !this.isVisible) {
      this.overlayPane.style.display = this.previousStyleDisplay!; // if there was no display before, unset the display
      this.isVisible = true;
    } else if (!visible && this.isVisible) {
      this.previousStyleDisplay = this.overlayPane.style.display;
      this.overlayPane.style.display = 'none';
      this.isVisible = false;
    }
  }

  addOverlays(bpmnElementId: string, overlays: Overlay | Overlay[]): void {
    this.overlaysRegistry.addOverlays(bpmnElementId, overlays);
  }

  removeAllOverlays(bpmnElementId: string): void {
    this.overlaysRegistry.removeAllOverlays(bpmnElementId);
  }

  getPluginId(): string {
    return 'overlays';
  }
}
