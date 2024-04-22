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

import { readFileSync as fsReadFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// assume that this module/file is stored in a direct sub-folder of the test root
const testRootFolder = path.join(__dirname, '..');

export const readFileSync = (relativePathFromTestRootFolder: string): string => fsReadFileSync(path.join(testRootFolder, relativePathFromTestRootFolder), { encoding: 'utf8' });
