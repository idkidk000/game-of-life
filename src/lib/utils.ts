export function omit<Item extends object, Key extends Extract<keyof Item, string>, Return extends Omit<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Key))) as Return;
}
export function pick<Item extends object, Key extends Extract<keyof Item, string>, Return extends Pick<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Key))) as Return;
}
