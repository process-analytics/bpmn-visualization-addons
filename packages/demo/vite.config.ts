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

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// =====================================================================================================================
// Taken from bpmn-visualization test/shared/file-helper.ts
/** Returns the files in the given directory. The function doesn't do any recursion in subdirectories. */
function findFiles(relativePathToSourceDirectory: string): string[] {
  return readdirSync(path.join(path.dirname(fileURLToPath(import.meta.url)), relativePathToSourceDirectory));
}
// =====================================================================================================================

function generateInput(): Record<string, string> {
  const pages = findFiles('pages');
  const input: Record<string, string> = {
    index: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.html'),
  };
  for (const page of pages) {
    input[path.parse(page).name] = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `pages/${page}`);
  }
  return input;
}

export default defineConfig(() => {
  return {
    build: {
      rollupOptions: {
        input: generateInput(),
        output: {
          manualChunks: {
            // put mxgraph code in a dedicated file.
            mxgraph: ['mxgraph'],
          },
        },
      },
      chunkSizeWarningLimit: 838, // mxgraph
      // to add support for top-level await
      // see https://github.com/vitejs/vite/issues/6985#issuecomment-1044375490
      // see https://vitejs.dev/config/build-options#build-target
      target: ['esnext'],
    },
  };
});
