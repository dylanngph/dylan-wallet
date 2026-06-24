import type { KeyValueStore } from "./types.js";

/**
 * In-memory {@link KeyValueStore}. Used by tests and as a safe default; values
 * are structured-cloned on write so callers can't mutate stored objects.
 */
export class MemoryStore implements KeyValueStore {
  #map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.#map.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.#map.set(key, structuredClone(value));
  }

  async remove(key: string): Promise<void> {
    this.#map.delete(key);
  }
}
