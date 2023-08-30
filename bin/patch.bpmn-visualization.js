import { copyFileSync } from 'node:fs';

console.info('Replacing bpmn-visualization package.json by a patched version....');
copyFileSync('./patches/bpmn-visualization_0.38.1.package.json', './node_modules/bpmn-visualization/package.json');
console.info('File replaced!');
