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

// list all pages in the `pages` directory and add them as entry points for the build
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
      rolldownOptions: {
        input: generateInput(),
        output: {
          // Put dependencies in dedicated files.
          // bpmn-visualization dependencies must have a higher priority, otherwise Rolldown includes them
          // in the bpmn-visualization chunk (dependencies are recursively pulled into matching groups by default).
          codeSplitting: {
            groups: [
              {
                name: 'lib-bpmn-visualization',
                test: /node_modules\/bpmn-visualization/,
                priority: 0,
              },
              // bpmn-visualization dependencies
              {
                name: 'lib-es-toolkit',
                test: /node_modules\/es-toolkit/,
                priority: 10,
              },
              {
                name: 'lib-fast-xml-parser',
                test: /node_modules\/fast-xml-parser/,
                priority: 10,
              },
              {
                name: 'lib-mxgraph',
                test: /node_modules\/mxgraph/,
                priority: 10,
              },
            ],
          },
        },
      },
      // minify: false,
      chunkSizeWarningLimit: 834, // mxgraph
      // to add support for top-level await
      // see https://github.com/vitejs/vite/issues/6985#issuecomment-1044375490
      // see https://vitejs.dev/config/build-options#build-target
      target: ['esnext'],
    },
  };
});
