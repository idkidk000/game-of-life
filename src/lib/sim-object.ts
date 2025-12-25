// https://conwaylife.com/wiki/RLE

import rles from '@/res/rles.txt?raw';

export interface SimObjectLike {
  comment?: string;
  height: number;
  name?: string;
  points: [x: number, y: number][];
  width: number;
  id: string;
}

export class SimObject implements SimObjectLike {
  #width: number;
  #height: number;
  #name?: string;
  #comment?: string;
  #points: [x: number, y: number][];
  #id: string;
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
          ++y;
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
      this.#height = maxY - minY;
      this.#name = nameMatch?.groups?.name;
      this.#points = points;
      this.#width = maxX - minX;
      // crypto.randomUUID would be better but it's only available in secure contexts for absolutely no useful reason
      this.#id = `${this.#name ?? 'unkown'}-${Date.now() % Math.round(Math.random() * 10_000)}`;
    } else {
      this.#comment = param.comment;
      this.#height = param.height;
      this.#name = param.name;
      this.#points = param.points;
      this.#width = param.width;
      this.#id = param.id;
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
  toJSON(): SimObjectLike {
    return {
      comment: this.#comment,
      height: this.#height,
      name: this.#name,
      points: this.#points,
      width: this.#width,
      id: this.#id,
    };
  }
}

export const defaultSimObjects = rles
  .replaceAll(/^\/\/.*$/gm, '')
  .split('\n\n')
  .filter((item) => item.trim().length)
  .map((rle) => new SimObject(rle));
