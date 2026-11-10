import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(__filename);
let root = path.dirname(require.resolve('@antv/gpt-vis'));
while (!fs.existsSync(path.join(root, 'package.json'))) root = path.dirname(root);

let runtime: string;
let reference: string;

export function chartRuntime() {
  return (runtime ||= fs
    .readFileSync(path.join(root, 'dist/umd/index.min.js'), 'utf8')
    .replace(/<\/script/gi, '<\\/script'));
}

// Use the installed renderer's public declarations and examples, not an app-maintained chart list.
export function chartReference() {
  if (!reference) {
    const dir = path.join(root, 'dist/esm');
    const files = [
      'types/index.d.ts',
      'types/theme.d.ts',
      ...fs
        .readdirSync(path.join(dir, 'vis'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `vis/${entry.name}/index.d.ts`),
    ];
    reference = files.map((file) => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
  }
  return reference;
}
