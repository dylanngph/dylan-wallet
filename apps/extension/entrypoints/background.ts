import { defineBackground, browser } from "#imports";
import { Keyring, generateRecoveryPhrase } from "@dylan-wallet/core";
import { ExtensionStore } from "../lib/storage";
import type { WalletRequest, WalletState } from "../lib/messaging";

const AUTO_LOCK_MS = 15 * 60 * 1000; // lock 15 min after the last interaction

/**
 * The background service worker is the wallet's trust boundary: it is the only
 * context that holds the unlocked {@link Keyring}. The popup talks to it over
 * `runtime.sendMessage`; secret material never leaves this worker. MV3 may
 * terminate the worker when idle, which transparently discards the in-memory
 * mnemonic — i.e. the wallet re-locks on its own.
 */
export default defineBackground(() => {
  const keyring = new Keyring(new ExtensionStore());
  let autoLockTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleAutoLock() {
    if (autoLockTimer) clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => keyring.lock(), AUTO_LOCK_MS);
  }

  async function handle(req: WalletRequest): Promise<unknown> {
    switch (req.type) {
      case "getState":
        return {
          initialized: await keyring.isInitialized(),
          unlocked: keyring.isUnlocked(),
          accounts: await keyring.getAccounts(),
          selectedIndex: (await keyring.getSelectedAccount())?.index ?? null,
        } satisfies WalletState;
      case "generateSeedPhrase":
        return generateRecoveryPhrase();
      case "createVault":
        await keyring.createVault({ password: req.password, mnemonic: req.mnemonic });
        scheduleAutoLock();
        return;
      case "unlock":
        await keyring.unlock(req.password);
        scheduleAutoLock();
        return;
      case "lock":
        if (autoLockTimer) clearTimeout(autoLockTimer);
        keyring.lock();
        return;
      case "addAccount":
        return keyring.addAccount(req.label);
      case "selectAccount":
        await keyring.selectAccount(req.index);
        return;
      case "exportMnemonic":
        return keyring.exportMnemonic(req.password);
    }
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const req = message as WalletRequest;
    // Any authenticated interaction refreshes the idle timer.
    if (keyring.isUnlocked()) scheduleAutoLock();
    handle(req).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
    return true; // keep the message channel open for the async response
  });
});
