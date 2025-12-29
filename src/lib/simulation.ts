import type { Tool } from '@/hooks/tools';

export type SimRule = (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)[];

export interface SimRules {
  born: SimRule;
  survive: SimRule;
}

export interface SimSpawn {
  radius: number;
  /** percent */
  chance: number;
}

export const defaultSimRules: SimRules = {
  born: [3],
  survive: [2, 3],
};

export const defaultSimSpawn: SimSpawn = {
  chance: 1.6,
  radius: 15,
};

export enum SimPrune {
  Oldest,
  Youngest,
}

export class Simulation {
  #width: number;
  #height: number;
  /** structure:\
   * 12-15: unused\
   *  4-11: age\
   *  0- 3: neighbours
   */
  #current: Uint16Array;
  #next: Uint16Array;
  #steps = 0;
  /** bitmask shifted 1 left so 0 can be a distinct value */
  #born = 0;
  #survive = 0;
  #spawn: SimSpawn = { ...defaultSimSpawn };
  #alive = 0;
  #wrap: boolean;
  #dirty = false;
  constructor(width: number, height: number, rules: SimRules = defaultSimRules, spawn: SimSpawn = defaultSimSpawn, wrap = true) {
    this.#width = width;
    this.#height = height;
    this.#current = new Uint16Array(width * height);
    this.#next = new Uint16Array(width * height);
    this.spawn = spawn;
    this.rules = rules;
    this.#wrap = wrap;
  }
  get width() {
    return this.#width;
  }
  get height() {
    return this.#height;
  }
  get size() {
    return this.#width * this.#height;
  }
  get steps() {
    return this.#steps;
  }
  get alive() {
    return this.#alive;
  }
  get wrap() {
    return this.#wrap;
  }
  get spawn() {
    return { ...this.#spawn };
  }
  get dirty() {
    return this.#dirty;
  }
  set rules({ born, survive }: SimRules) {
    this.#born = (born as number[]).reduce((acc, item) => acc | (1 << item), 0);
    this.#survive = (survive as number[]).reduce((acc, item) => acc | (1 << item), 0);
  }
  set spawn(config: SimSpawn) {
    this.#spawn = { ...config };
  }
  set wrap(wrap: boolean) {
    this.#wrap = wrap;
  }
  #indexToXy(index: number): [x: number, y: number] {
    const y = Math.floor(index / this.#width);
    const x = index - y * this.#width;
    return [x, y];
  }
  /** **note**: this returns -1 for oob when wrap is disabled
   *
   * `typedArray[-1] = value` fails silently\
   * `typedArray[-1]` returns `undefined`
   */
  #xyToIndex(x: number, y: number): number {
    if (!this.#wrap && (x < 0 || x >= this.#width || y < 0 || y >= this.height)) return -1;
    return (
      (y < 0 ? this.#height + y : y >= this.#height ? this.#height - y : y) * this.#width + (x < 0 ? this.#width + x : x >= this.#width ? this.#width - x : x)
    );
  }
  #updateNeighbours(array: Uint16Array, index: number, value: 1 | -1): void;
  #updateNeighbours(array: Uint16Array, point: [x: number, y: number], value: 1 | -1): void;
  #updateNeighbours(array: Uint16Array, param: number | [x: number, y: number], value: 1 | -1) {
    const [x, y] = typeof param === 'number' ? this.#indexToXy(param) : param;
    array[this.#xyToIndex(x + 0, y + 1)] += value;
    array[this.#xyToIndex(x + 1, y + 1)] += value;
    array[this.#xyToIndex(x + 1, y + 0)] += value;
    array[this.#xyToIndex(x + 1, y - 1)] += value;
    array[this.#xyToIndex(x + 0, y - 1)] += value;
    array[this.#xyToIndex(x - 1, y - 1)] += value;
    array[this.#xyToIndex(x - 1, y + 0)] += value;
    array[this.#xyToIndex(x - 1, y + 1)] += value;
  }
  updateSize(width: number, height: number): void {
    if (width < 10) width = 10;
    if (height < 10) height = 10;
    console.debug('sim resizing from', this.#width, 'x', this.#height, 'to', width, 'x', height);
    const resized = new Uint16Array(width * height);
    for (let i = 0; i < resized.length; ++i) {
      const resizedX = i % width;
      const resizedY = Math.floor(i / width);
      const prevX = Math.round(this.#width / 2 - width / 2) + resizedX;
      const prevY = Math.round(this.#height / 2 - height / 2) + resizedY;
      if (prevX < 0 || prevX >= this.#width || prevY < 0 || prevY >= this.#height) continue;
      resized[i] = this.#current[this.#xyToIndex(prevX, prevY)];
    }
    this.#width = width;
    this.#height = height;
    this.#current = resized;
    this.#next = new Uint16Array(width * height);
    this.#dirty = true;
  }
  clear(): void {
    this.#current.fill(0);
    this.#steps = 0;
    this.#dirty = true;
  }
  seed(): void {
    // set a random neighbour count
    for (let i = 0; i < this.#current.length; ++i) this.#current[i] = (this.#current[i] & 0xff0) | Math.round(Math.random() * 8);
    this.#dirty = true;
  }
  /** remove by age */
  prune(type: SimPrune = SimPrune.Oldest): void {
    // mean of the min and max ages
    const threshold =
      this.#current
        .map((value) => value >> 4)
        .reduce((acc, item) => [Math.min(acc[0], item), Math.max(acc[1], item)], [255, 0])
        .reduce((acc, item) => acc + item) / 2;
    console.debug('prune', { type, threshold });
    for (let i = 0; i < this.#current.length; ++i) {
      const age = this.#current[i] >> 4;
      if (age === 0) continue;
      if ((type === SimPrune.Youngest && age > threshold) || (type === SimPrune.Oldest && age < threshold)) continue;
      // clear age
      this.#current[i] = this.#current[i] & 0xf;
      // remove from neighbour's neighbour counts
      this.#updateNeighbours(this.#current, i, -1);
    }
    this.#dirty = true;
  }
  use(x: number, y: number, tool: Tool) {
    if (tool.id === 'noise' || tool.id === 'erase') {
      const r2 = this.#spawn.radius ** 2;
      for (let rx = -this.#spawn.radius; rx <= this.#spawn.radius; ++rx)
        for (let ry = -this.#spawn.radius; ry <= this.#spawn.radius; ++ry) {
          if (rx ** 2 + ry ** 2 > r2) continue;
          const index = this.#xyToIndex(rx + x, ry + y);
          this.#current[index] = tool.id === 'noise' ? (this.#current[index] & 0xff0) | Math.round(Math.random() * 8) : 0;
        }
    } else {
      if (!('points' in tool)) throw new Error('invalid tool');
      let { width, height } = tool;
      let points: typeof tool.points = [];
      if (tool.rotation === 0) points = tool.points;
      else if (tool.rotation === 2) points = tool.points.map(([x, y]) => [width - x, height - y]);
      else if (tool.rotation === 1) {
        points = tool.points.map(([x, y]) => [height - y, x]);
        [width, height] = [height, width];
      } else if (tool.rotation === 3) {
        points = tool.points.map(([x, y]) => [y, width - x]);
        [width, height] = [height, width];
      }
      const halfWidth = Math.round(width / 2);
      const halfHeight = Math.round(height / 2);
      for (let ox = -3; ox < width + 3; ++ox)
        for (let oy = -3; oy < height + 3; ++oy) this.#current[this.#xyToIndex(x - halfWidth + ox, y - halfHeight + oy)] = 0;
      for (const [ox, oy] of points) {
        const [cx, cy] = [x - halfWidth + ox, y - halfHeight + oy];
        const index = this.#xyToIndex(cx, cy);
        if (index === -1) continue;
        // set alive
        this.#current[index] = 0x10 | (this.#current[index] & 0xf);
        this.#updateNeighbours(this.#current, [cx, cy], 1);
      }
    }
    this.#dirty = true;
  }
  /** @returns performance duration in whole millis since we don't have high precision timers on the client */
  // TODO: add a local dirty array and use it to copy unchanged regions
  // TODO: possibly just expose start/stop/singleStep methods and have the sim loop run async
  step(count = 1): number {
    const started = performance.now();
    for (let iteration = 0; iteration < count; ++iteration) {
      // outside of the loop so we don't interfere with neighbour count incrementing
      if (this.#spawn.chance / 100 >= Math.random()) this.use(...this.#indexToXy(Math.round(Math.random() * this.#current.length)), { id: 'noise' });
      this.#alive = 0;
      // simulation loop
      for (let i = 0; i < this.#current.length; ++i) {
        const age = this.#current[i] >> 4;
        const neighbours = this.#current[i] & 0xf;
        const nextAlive = (age === 0 && (this.#born & (1 << neighbours)) > 0) || (age > 0 && (this.#survive & (1 << neighbours)) > 0);
        if (nextAlive) {
          // write nextAge and preserve existing partial nextNeighbours
          this.#next[i] = (Math.min(age + 1, 255) << 4) | (this.#next[i] & 0xf);
          // increment neighbour's neighbour counts
          this.#updateNeighbours(this.#next, i, 1);
          // accessible as a property
          ++this.#alive;
        }
      }
      // swap arrays
      [this.#current, this.#next] = [this.#next, this.#current];
      this.#next.fill(0);
    }
    this.#steps += count;
    this.#dirty = true;
    return performance.now() - started;
  }
  /** age is 0-255, neighbours is 0-8 */
  *values(all = false): Generator<[x: number, y: number, age: number, neighbours: number], undefined, undefined> {
    for (let i = 0; i < this.#current.length; ++i)
      if (all || this.#current[i] & 0xff0) yield [...this.#indexToXy(i), this.#current[i] >> 4, this.#current[i] & 0xf];
    this.#dirty = false;
  }
  /** there is no browser equivalent of `inspect.custom` from `node:util` */
  inspect() {
    return {
      width: this.#width,
      height: this.#height,
      steps: this.#steps,
      alive: this.#alive,
    };
  }
}
