/**
 * `pixelarticons` contains good icons but the attributes are inconsistent and the packaging is bad
 *  this script repackages the svgs into sensible react components with all attributes overridable
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';

const sourcePath = 'node_modules/pixelarticons/svg';
const destPath = 'src/generated';
const destName = 'icons.tsx';

const head = `/**
 * This file was automatically generated from the \`pixelarticons\` package by \`${relative(cwd(), fileURLToPath(import.meta.url))}\`
 */

import type { JSX, SVGProps } from 'react';
`;
const digitNames = new Map([
  ['0', 'Zero'],
  ['1', 'One'],
  ['2', 'Two'],
  ['3', 'Three'],
  ['4', 'Four'],
  ['5', 'Five'],
  ['6', 'Six'],
  ['7', 'Seven'],
  ['8', 'Eight'],
  ['9', 'Nine'],
]);
const reserved = new Set(['Array', 'Map', 'Number', 'Set', 'String']);

async function generateComponent(fileName: string) {
  const sourceFile = join(sourcePath, fileName);

  const content = await readFile(sourceFile, { encoding: 'utf-8' });
  // match only the `d="..."` part of the path elements and skip any attributes
  const pathMatches = [...content.matchAll(/<path.*\s+d="(?<d>[^"]+)"/g)].map((entry) => entry.groups?.d);

  if (pathMatches.some((path) => typeof path === 'undefined')) throw new Error('could not match path', { cause: { sourceFile, content } });

  const componentName = fileName
    .replace(/\.svg$/, '')
    // split on [digit]->[alpha] boundary and hyphen
    .split(/([0-9](?=[a-z])|-)/)
    .filter((token) => token.length && token !== '-')
    // names may not begin with digits
    .map((token, i) => (i === 0 ? `${digitNames.get(token[0]) ?? token[0]}${token.slice(1)}` : token))
    // titlecase each token
    .map((token) => `${token[0].toLocaleUpperCase()}${token.slice(1)}`)
    // append 'Icon' to reserved names
    .map((token, i, arr) => (i === 0 && arr.length === 1 && reserved.has(token) ? `${token}Icon` : token))
    .join('');

  return `
export function ${componentName}(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg aria-hidden='true' fill='currentColor' stroke='currentColor' strokeLinecap='square' strokeWidth='1' viewBox='0 0 24 24' {...props}>
      ${pathMatches.map((path) => `<path d='${path}' />`).join('\n      ')}
    </svg>
  );
}
`;
}

const sourceNames = (await readdir(sourcePath, { encoding: 'utf-8', recursive: false, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
  .map(({ name }) => name)
  .toSorted();
const components = await Promise.all(sourceNames.map(generateComponent));
const output = [head, ...components].join('');

await mkdir(destPath, { recursive: true });
const destFile = join(destPath, destName);
const contents = await readFile(destFile, { encoding: 'utf-8' }).catch(() => '');

if (output !== contents) {
  await writeFile(destFile, [head, ...components].join(''));
  console.info('wrote', components.length, 'components to', destFile);
} else console.info('no updates made to', destFile);
