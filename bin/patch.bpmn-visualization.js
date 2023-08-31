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

import { copyFileSync } from 'node:fs';

/* eslint-disable no-console -- provide message when installing packages */
console.info('Replacing bpmn-visualization package.json by a patched version....');
copyFileSync('./patches/bpmn-visualization_0.38.1.package.json', './node_modules/bpmn-visualization/package.json');
console.info('File replaced!');
