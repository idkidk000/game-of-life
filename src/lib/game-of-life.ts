const offsets: [x: number, y: number][] = [
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
];

export class GameOfLife {
  #width: number;
  #height: number;
  #current: Uint8Array;
  #next: Uint8Array;
  #dirty: boolean[];
  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#current = new Uint8Array(width * height);
    this.#next = new Uint8Array(width * height);
    this.#dirty = new Array<boolean>(width * height).fill(true);
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
  indexToXy(index: number): [x: number, y: number] {
    return [index % this.#width, Math.floor(index / this.#width)];
  }
  xyToIndex(x: number, y: number): number {
    return (y < 0 ? this.#height + y : y >= this.#height ? this.#height - y : y) * this.#width + (x < 0 ? this.#width + x : x >= this.#width ? this.#width - x : x);
  }
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    // TODO: nearest neighbour maybe?
    this.#current = new Uint8Array(width * height);
    this.#next = new Uint8Array(width * height);
    this.#dirty = new Array<boolean>(width * height).fill(true);
  }
  clear(): void {
    this.#current.fill(0);
    this.#dirty.fill(true);
  }
  fill(): void {
    for (let i = 0; i < this.#current.length; ++i) if (Math.random() > 0.7) this.#current[i] = 1;
  }
  // TODO
  spawn(from: [x: number, y: number], to: [x: number, y: number], radius = 3): void {
    //TODO: validate that x is within sim range (canvas is taller)
  }
  /** @returns performance duration in millis */
  // TODO: this is still too slow. maybe use 3 bits for neighbour count which can be incremented in neighbours on write. then we're not looping over a lot of empty cells
  step(count = 1, randomSpawn = false): number {
    const started = performance.now();
    for (let iteration = 0; iteration < count; ++iteration) {
      // simulate
      for (let i = 0; i < this.#current.length; ++i) {
        const value = this.#current[i];
        const isLive = value > 0;
        let neighboursLive = 0;
        const [x, y] = this.indexToXy(i);
        // TODO: may need to unroll this loop
        for (let o = 0; o < offsets.length; ++o) {
          const [ox, oy] = offsets[o];
          if (this.#current[this.xyToIndex(x + ox, y + oy)] > 0) ++neighboursLive;
          if (neighboursLive > 3 || (neighboursLive === 0 && o === 6)) break;
        }
        if (isLive && neighboursLive >= 2 && neighboursLive <= 3) {
          const next = Math.min(255, value + 1);
          this.#next[i] = next;
          if (next !== value) this.#dirty[i] = true;
        } else if (!isLive && neighboursLive === 3) {
          this.#next[i] = 1;
          this.#dirty[i] = true;
        } else if (randomSpawn && Math.random() > 0.999999) {
          for (let ox = -2; ox <= 2; ++ox)
            for (let oy = -2; oy <= 2; ++oy)
              if (Math.random() > 0.7) {
                const index = this.xyToIndex(x + ox, y + oy);
                this.#next[this.xyToIndex(x + ox, y + oy)] = Math.min(255, value + 1);
                this.#dirty[index] = true;
              }
        } else if (isLive) this.#dirty[i] = true;
      }
      // swap
      [this.#current, this.#next] = [this.#next, this.#current];
      this.#next.fill(0);
    }
    return performance.now() - started;
  }
  *deltas(): Generator<[x: number, y: number, value: number], undefined, undefined> {
    for (let i = 0; i < this.#dirty.length; ++i) if (this.#dirty[i]) yield [...this.indexToXy(i), this.#current[i]];
    this.#dirty.fill(false);
  }
  *values(): Generator<[x: number, y: number, value: number], undefined, undefined> {
    for (let i = 0; i < this.#current.length; ++i) yield [...this.indexToXy(i), this.#current[i]];
  }
  stats(): { dirty: number; live: number } {
    let dirty = 0;
    let live = 0;
    for (let i = 0; i < this.#dirty.length; ++i) {
      if (this.#dirty[i]) ++dirty;
      if (this.#current[i] > 0) ++live;
    }
    return { dirty, live };
  }
}
