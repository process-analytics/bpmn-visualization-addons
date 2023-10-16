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

import type { BpmnVisualization, Plugin } from '@process-analytics/bv-experimental-add-ons';
import type { OverlaysRegistry } from 'bpmn-visualization';

export class OverlaysByStatusPlugin implements Plugin {
  private readonly overlaysRegistry: OverlaysRegistry;

  constructor(bpmnVisualization: BpmnVisualization) {
    this.overlaysRegistry = bpmnVisualization.bpmnElementsRegistry;
  }

  getPluginId(): string {
    return 'overlays-by-status';
  }

  addOverlayForSuccess(bpmnElementId: string, executionCount: number): void {
    this.overlaysRegistry.addOverlays(bpmnElementId, {
      position: 'top-left',
      label: `${executionCount}`,
      style: {
        font: { color: 'white', size: 24 },
        fill: { color: 'DarkSeaGreen' },
        stroke: { color: 'DarkSeaGreen', width: 2 },
      },
    });
  }

  addOverlayForError(bpmnElementId: string, executionCount: number): void {
    this.overlaysRegistry.addOverlays(bpmnElementId, {
      position: 'top-right',
      label: `${executionCount}`,
      style: {
        font: { color: 'white', size: 28 },
        fill: { color: 'Red' },
        stroke: { color: 'Red', width: 2 },
      },
    });
  }
}
