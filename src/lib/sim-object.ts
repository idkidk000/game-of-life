// https://conwaylife.com/wiki/RLE

import { pointsToPath } from '@/lib/utils';
import rles from '@/res/rles.txt?raw';

export interface SimObjectLike {
  comment?: string;
  height: number;
  name?: string;
  points: [x: number, y: number][];
  width: number;
  id: string;
  path: string;
}

// there are no clientside synchronous hashing apis
function hash(pattern: string): string {
  const length = 18;
  // map 0-9ob$ to 0-9a-c and split into pairs
  const replaced = pattern
    .replaceAll('o', 'a')
    .replaceAll('$', 'c')
    .split(/(..?)/g)
    .filter((item) => item.length);
  const u8 = new Uint8Array(replaced.length);
  let i = 0;
  // fill them into a u8 array
  for (const pair of replaced) u8[i++] = parseInt(pair, 16);
  // mult by an odd number and xor backwards until we're < length (very bad, but hopefully not bad enough to be a problem)
  while (i >= length) {
    u8[i - length] ^= u8[i] * (Math.ceil(i / length / 2) * 2) + 1;
    i--;
  }
  // @ts-expect-error it does on the client
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64
  const hashed: string = u8.subarray(0, length).toBase64();
  console.debug({ pattern, hashed });
  return hashed;
}

export class SimObject implements SimObjectLike {
  #width: number;
  #height: number;
  #name?: string;
  #comment?: string;
  #points: [x: number, y: number][];
  #id: string;
  #path: string;
  constructor(object: SimObjectLike);
  constructor(rleString: string);
  constructor(param: SimObjectLike | string) {
    if (typeof param === 'string') {
      // these could be on any line in any order, and the pattern can span many lines
      const nameMatch = /^#N\s?(?<name>[^\n]+)$/m.exec(param);
      // there could be multiple comments actually but i don't care that much
      const commentMatch = /^#C\s?(?<comment>[^\n]+)$/m.exec(param);
      const patternMatch = /^(?<pattern>[\dbo$\s]+)!/m.exec(param);
      if (!patternMatch?.groups) throw new Error('could not match pattern', { cause: param });
      console.log(nameMatch?.groups, commentMatch?.groups, patternMatch?.groups);
      const pattern = patternMatch.groups.pattern.replaceAll(/\s/g, '');

      let quantifier = '';
      let x = 0;
      let y = 0;
      const points: [x: number, y: number][] = [];
      for (const token of pattern) {
        if (/\d/.exec(token)) quantifier += token;
        else if (token === '$') {
          y += quantifier ? parseInt(quantifier, 10) : 1;
          x = 0;
          quantifier = '';
        } else if (token === 'b') {
          x += quantifier ? parseInt(quantifier, 10) : 1;
          quantifier = '';
        } else if (token === 'o') {
          for (let i = 0; i < (quantifier ? parseInt(quantifier, 10) : 1); ++i) {
            points.push([x, y]);
            ++x;
          }
          quantifier = '';
        } else throw new Error('unknown pattern token', { cause: { pattern, token } });
        // console.debug({ token, x, y, quantifier });
      }

      // biome-ignore format: do not
      const { minX, maxX, minY, maxY } = points.reduce((acc, item) => {
        acc.minX = Math.min(acc.minX, item[0]);
        acc.maxX = Math.max(acc.maxX, item[0]);
        acc.minY = Math.min(acc.minY, item[1]);
        acc.maxY = Math.max(acc.maxY, item[1]);
        return acc;
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      this.#comment = commentMatch?.groups?.comment;
      this.#height = maxY - minY + 1;
      this.#name = nameMatch?.groups?.name;
      this.#points = points;
      this.#width = maxX - minX + 1;
      this.#id = hash(pattern);
      this.#path = pointsToPath(points);
    } else {
      this.#comment = param.comment;
      this.#height = param.height;
      this.#name = param.name;
      this.#points = param.points;
      this.#width = param.width;
      this.#id = param.id;
      this.#path = param.path;
    }
  }
  get width() {
    return this.#width;
  }
  get height() {
    return this.#height;
  }
  get name() {
    return this.#name;
  }
  get comment() {
    return this.#comment;
  }
  get points() {
    return this.#points;
  }
  get id() {
    return this.#id;
  }
  get path() {
    return this.#path;
  }
  toJSON(): SimObjectLike {
    return {
      comment: this.#comment,
      height: this.#height,
      name: this.#name,
      points: this.#points,
      width: this.#width,
      id: this.#id,
      path: this.#path,
    };
  }
}

export const defaultSimObjects = rles
  .replaceAll(/^\/\/.*$/gm, '')
  .split('\n\n')
  .filter((item) => item.trim().length)
  .map((rle) => new SimObject(rle).toJSON());
