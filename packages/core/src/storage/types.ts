/**
 * Minimal async key/value store. Each host app injects a concrete backend
 * (extension → `chrome.storage.local`; web → IndexedDB/localStorage; tests →
 * in-memory) so `@dylan-wallet/core` stays free of platform globals.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
