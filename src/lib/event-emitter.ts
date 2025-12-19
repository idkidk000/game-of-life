type Callback = () => void;

export class EventEmitter<Event> {
  #callbacks = new Map<Event, Set<Callback>>();
  emit(event: Event) {
    for (const callback of this.#callbacks.get(event) ?? []) callback();
  }
  subscribe(event: Event, callback: Callback) {
    if (!this.#callbacks.get(event)?.add(callback)) this.#callbacks.set(event, new Set([callback]));
    // useEffect destructor
    return () => void this.#callbacks.get(event)?.delete(callback);
  }
}
