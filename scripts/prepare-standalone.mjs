import { cp, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');
const assets = [
  ['.next', 'static'],
  ['public'],
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

for (const segments of assets) {
  const source = join(root, ...segments);
  if (!(await exists(source))) continue;

  const destination = join(standalone, ...segments);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}
