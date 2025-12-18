export class GameOfLife {
  #width: number;
  #height: number;
  /** structure:\
   * 12-15: unused\
   * 4-11: age\
   * 0-3: neighboursAlive
   */
  #current: Uint16Array;
  #next: Uint16Array;
  #dirty: boolean[];
  /** guards against iterating over `#dirty` unnecessarily in `deltas` iterator */
  #isDirty = true;
  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#current = new Uint16Array(width * height);
    this.#next = new Uint16Array(width * height);
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
  #indexToXy(index: number): [x: number, y: number] {
    return [index % this.#width, Math.floor(index / this.#width)];
  }
  #xyToIndex(x: number, y: number): number {
    return (y < 0 ? this.#height + y : y >= this.#height ? this.#height - y : y) * this.#width + (x < 0 ? this.#width + x : x >= this.#width ? this.#width - x : x);
  }
  resize(width: number, height: number): void {
    if (width < 10) width = 10;
    if (height < 10) height = 10;
    const maxAge = Array.prototype.reduce.bind(this.#current)((acc, item) => Math.max(acc, item >> 4), 0);
    console.debug('sim resizing from', this.#width, 'x', this.#height, 'to', width, 'x', height, { maxAge });
    const resized = new Uint16Array(width * height);
    if (maxAge > 5)
      // there's a bug where the first resize (page load) results in #current being filled with noise. subsequent resizes work fine
      // this comment should be above `if (maxAge...` but biome disagrees
      for (let i = 0; i < resized.length; ++i) {
        const resizedX = i % width;
        const resizedY = Math.floor(i / width);
        const prevX = Math.floor((resizedX / width) * this.#width);
        const prevY = Math.floor((resizedY / height) * this.#height);
        const prevIndex = this.#xyToIndex(prevX, prevY);
        const value = this.#current[prevIndex];
        resized[i] = value;
      }
    this.#width = width;
    this.#height = height;
    this.#current = resized;
    this.#next = new Uint16Array(width * height);
    this.#dirty = new Array<boolean>(width * height).fill(true);
  }
  clear(): void {
    this.#current.fill(0);
    this.#dirty.fill(true);
  }
  fill(): void {
    // set a random neighbour count
    for (let i = 0; i < this.#current.length; ++i) this.#current[i] = (this.#current[i] & 0xff0) | Math.round(Math.random() * 8);
  }
  spawn(x: number, y: number, radius = 3): void {
    for (let rx = -radius; rx <= radius; ++rx)
      for (let ry = -radius; ry <= radius; ++ry) {
        const index = this.#xyToIndex(rx + x, ry + y);
        // set a random neighbour count
        this.#current[index] = (this.#current[index] & 0xff0) | Math.round(Math.random() * 8);
      }
  }
  #writeNext(index: number, age: number, alive: boolean): void {
    const nextAge = alive ? Math.min(age + 1, 255) : 0;
    if (age !== nextAge) {
      // write new age, mark dirty
      this.#dirty[index] = true;
      const neighbourCount = this.#next[index] & 0xf;
      const nextValue = (nextAge << 4) | neighbourCount;
      this.#next[index] = nextValue;
    }
    if (nextAge > 0) {
      // increment neighbour's neighbourAlive counts
      const [x, y] = this.#indexToXy(index);
      ++this.#next[this.#xyToIndex(x, y + 1)];
      ++this.#next[this.#xyToIndex(x + 1, y + 1)];
      ++this.#next[this.#xyToIndex(x + 1, y)];
      ++this.#next[this.#xyToIndex(x + 1, y - 1)];
      ++this.#next[this.#xyToIndex(x, y - 1)];
      ++this.#next[this.#xyToIndex(x - 1, y - 1)];
      ++this.#next[this.#xyToIndex(x - 1, y)];
      ++this.#next[this.#xyToIndex(x - 1, y + 1)];
    }
  }
  /** @returns performance duration in millis */
  step(count = 1, randomSpawn = false): number {
    const started = performance.now();
    for (let iteration = 0; iteration < count; ++iteration) {
      // simulate
      for (let i = 0; i < this.#current.length; ++i) {
        const value = this.#current[i];
        const age = value >> 4;
        const neighboursAlive = value & 0xf;
        const isAlive = age > 0;
        if (isAlive && neighboursAlive >= 2 && neighboursAlive <= 3) this.#writeNext(i, age, true);
        else if (!isAlive && neighboursAlive === 3) this.#writeNext(i, age, true);
        else if (randomSpawn && Math.random() > 0.999999) this.spawn(...this.#indexToXy(i));
        // was alive, now dead - mark dirty
        else if (isAlive) this.#dirty[i] = true;
      }
      // swap
      [this.#current, this.#next] = [this.#next, this.#current];
      this.#next.fill(0);
      this.#isDirty = true;
    }
    return performance.now() - started;
  }
  *deltas(): Generator<[x: number, y: number, value: number], undefined, undefined> {
    if (this.#isDirty) for (let i = 0; i < this.#dirty.length; ++i) if (this.#dirty[i]) yield [...this.#indexToXy(i), this.#current[i] >> 4];
    this.#dirty.fill(false);
    this.#isDirty = false;
  }
  *values(): Generator<[x: number, y: number, value: number], undefined, undefined> {
    for (let i = 0; i < this.#current.length; ++i) yield [...this.#indexToXy(i), this.#current[i] >> 4];
    this.#dirty.fill(false);
    this.#isDirty = false;
  }
  stats(): { dirty: number; live: number } {
    let dirty = 0;
    let live = 0;
    for (let i = 0; i < this.#dirty.length; ++i) {
      if (this.#dirty[i]) ++dirty;
      if (this.#current[i] >> 4 > 0) ++live;
    }
    return { dirty, live };
  }
}
