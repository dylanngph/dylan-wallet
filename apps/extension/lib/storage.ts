import { browser } from "#imports";
import type { KeyValueStore } from "@dylan-wallet/core";

/**
 * {@link KeyValueStore} backed by `chrome.storage.local`. The encrypted vault
 * and (public) account metadata live here; secrets are only ever stored in
 * already-encrypted form.
 */
export class ExtensionStore implements KeyValueStore {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }
}
