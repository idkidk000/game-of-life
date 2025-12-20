export class SlidingWindow<Item> {
  #array: Item[];
  #front = 0;
  #back = 0;
  #size = 0;
  constructor(count: number) {
    this.#array = new Array<Item>(count);
  }
  get size() {
    return this.#size;
  }
  push(item: Item): void {
    this.#array[this.#back] = item;
    if (this.#back === this.#array.length - 1) this.#back = 0;
    else ++this.#back;
    if (this.#size === this.#array.length) {
      if (this.#front === this.#size - 1) this.#front = 0;
      else ++this.#front;
    } else ++this.#size;
  }
  at(index: number): Item | undefined {
    if (index >= 0) {
      if (index >= this.#size) return;
      const intermediate = index + this.#front;
      return this.#array.at(intermediate < this.#array.length ? intermediate : intermediate - this.#array.length);
    }
    if (-index > this.#size) return;
    const intermediate = this.#back + index;
    return this.#array.at(intermediate >= 0 ? intermediate : intermediate + this.#array.length);
  }
  clear(): void {
    this.#front = 0;
    this.#back = 0;
    this.#size = 0;
  }
  *items(): Generator<Item, undefined, undefined> {
    for (let i = 0; i < this.#size; ++i) {
      const intermediate = this.#front + i;
      yield this.#array[intermediate < this.#array.length ? intermediate : intermediate - this.#array.length];
    }
  }
  *pairs(): Generator<[Item, Item], undefined, undefined> {
    for (let i = 0; i < this.#size - 1; ++i) {
      const left = this.#front + i;
      const right = left + 1;
      yield [
        this.#array[left < this.#array.length ? left : left - this.#array.length],
        this.#array[right < this.#array.length ? right : right - this.#array.length],
      ];
    }
  }
}
