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

import '../assets/zoom-box.css';
import type { BpmnVisualization, FitOptions } from 'bpmn-visualization';

import { ZoomType } from 'bpmn-visualization';

const getButtonByQuerySelector = (container: HTMLDivElement, selectors: string): HTMLButtonElement => container.querySelector(selectors) as HTMLButtonElement;

const addDomElement = (): HTMLDivElement => {
  const div = document.createElement('div');
  div.classList.add('zoomBox');
  div.innerHTML = `<button class="sideButton float-left" title="Zoom out">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
          <path
            d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z" />
        </svg>
      </button>
      <button class="mainButton" title="Reset zoom">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">
          <path d="M6 1a1 1 0 0 1-1 1H3a1 1 0 0 0-1 1v2a1 1 0 1 1-2 0V3c0-1.654 1.346-3 3-3h2a1 1 0 0 1 1 1zm9-1h-2a1 1 0 1 0 0 2h2a1 1 0 0 1 1 1v2a1 1 0 1 0 2 0V3c0-1.654-1.346-3-3-3ZM5 16H3a1 1 0 0 1-1-1v-2a1 1 0 1 0-2 0v2c0 1.654 1.346 3 3 3h2a1 1 0 1 0 0-2Zm12-4a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1h-2a1 1 0 1 0 0 2h2c1.654 0 3-1.346 3-3v-2a1 1 0 0 0-1-1z"/>
        </svg>
      </button>
      <button class="sideButton float-right" title="Zoom in">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
          <path
            d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
        </svg>
      </button>`;
  document.body.append(div);
  return div;
};

export class ZoomComponent {
  private isRendered = false;
  constructor(
    private bpmnVisualization: BpmnVisualization,
    private fitOptions: FitOptions,
  ) {}

  render(): void {
    if (this.isRendered) {
      return;
    }
    const divElement = addDomElement();
    this.isRendered = true;
    getButtonByQuerySelector(divElement, '.sideButton.float-left').addEventListener('click', () => {
      this.bpmnVisualization.navigation.zoom(ZoomType.Out);
    });
    getButtonByQuerySelector(divElement, '.sideButton.float-right').addEventListener('click', () => {
      this.bpmnVisualization.navigation.zoom(ZoomType.In);
    });
    getButtonByQuerySelector(divElement, '.mainButton').addEventListener('click', () => {
      this.bpmnVisualization.navigation.fit(this.fitOptions);
    });
  }
}
