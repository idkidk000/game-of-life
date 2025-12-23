/**
 * `pixelarticons` contains good icons but the properties are inconsistent and the packaging is bad
 *  the repo seems dead, i have no interest in forking, and patching is annoying
 *  so this script just repackages the svgs into sensible react components
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';

const explanation = `/**
 * This file was automatically generated from the \`pixelarticons\` package by \`${relative(cwd(), fileURLToPath(import.meta.url))}\`
 */`;
const sourcePath = 'node_modules/pixelarticons/svg';
const destPath = 'src/components';
const destName = 'icons.tsx';

await mkdir(destPath, { recursive: true });

const sourceFiles = (await readdir(sourcePath, { encoding: 'utf-8', recursive: false, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
  .map(({ name }) => name);
// .slice(0, 2);

const componentStrings: string[] = [];
const openSet = new Set<string>();
let maxInnerLength = 0;
for (const sourceName of sourceFiles) {
  const sourceFile = join(sourcePath, sourceName);

  const content = await readFile(sourceFile, { encoding: 'utf-8' });
  const match = /^\s*(?<open><svg[^>]*>)\s*(?<inner>.*)\s*(?<close><\/svg>)\s*$/s.exec(content);
  if (!match?.groups) throw new Error('could not match', { cause: { sourceFile, content } });

  const componentName = sourceName
    .replace(/\.svg/, '')
    // capitalise first letter
    .replace(/^[a-z]/, (value) => value.toLocaleUpperCase())
    // capitalise letter after digit
    .replaceAll(/[0-9][a-z]/g, (value) => `${value[0]}${value[1].toLocaleUpperCase()}`)
    // names beginning with a number are invalid
    .replaceAll(/^[0-9]/g, (value) => {
      switch (value) {
        case '0':
          return 'Zero';
        case '1':
          return 'One';
        case '2':
          return 'Two';
        case '3':
          return 'Three';
        case '4':
          return 'Four';
        case '5':
          return 'Five';
        case '6':
          return 'Six';
        case '7':
          return 'Seven';
        case '8':
          return 'Eight';
        case '9':
          return 'Nine';
        default:
          throw new Error('oh no');
      }
    })
    // remove hyphen and capitalise next letter
    .replaceAll(/-./g, (value) => value.slice(1).toLocaleUpperCase())
    // do not override built-in class names
    .replace(/^Map$/, 'MapIcon');

  const inners = match.groups.inner
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length)
    .map((line) =>
      line
        .replace(/ fill="currentColor"/, '')
        .replaceAll('"', "'")
        .replaceAll(/\s*\/>/g, ' />')
    );
  if (inners.length > maxInnerLength || !/^[A-Z]/.exec(componentName) || !openSet.has(match.groups.open)) {
    openSet.add(match.groups.open);
    maxInnerLength = inners.length;
    // console.debug({ sourceName, componentName, open: match.groups.open, inners, close: match.groups.close });
  }
  const componentString = `export function ${componentName}(props: ComponentProps<'svg'>): JSX.Element {\n  return (\n    <svg fill='currentColor' viewBox='0 0 24 24' width='24' height='24' aria-hidden='true' {...props}>\n${inners.map((inner) => `      ${inner}\n`).join('')}    </svg>\n  );\n}`;
  // console.debug(componentString);
  componentStrings.push(componentString);
}
// console.debug({ maxInnerLength });

await writeFile(join(destPath, destName), [explanation, "import type { ComponentProps, JSX } from 'react';", ...componentStrings, ''].join('\n\n'));
console.info('wrote', componentStrings.length, 'components to', join(destPath, destName));
