import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SimObject } from '@/lib/sim-object';

const source = 'res/rles.txt';
const destPath = 'src/generated';
const destName = 'sim-objects.json';

const content = await readFile(source, { encoding: 'utf-8' });
const objects = content
  .replaceAll(/^\/\/.*$/gm, '')
  .split('\n\n')
  .filter((item) => item.trim().length)
  .map((rle) => new SimObject(rle).toJSON());
const output = JSON.stringify(objects);

await mkdir(destPath, { recursive: true });
const destFile = join(destPath, destName);
const existing = await readFile(destFile, { encoding: 'utf-8' }).catch(() => '');
if (output !== existing) {
  await writeFile(destFile, output);
  console.info('wrote', objects.length, 'objects to', destFile);
} else console.info('no updates made to', destFile);
