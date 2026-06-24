import { defineBackground, browser } from "#imports";
import type { WalletRequest } from "../lib/messaging";
import { WalletService } from "../services/wallet-service";
import { ApprovalService } from "../services/approval-service";
import { DappService } from "../services/dapp-service";

function safeOrigin(url?: string): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

/**
 * The background service worker is the wallet's trust boundary. It wires the
 * service layer together and routes two kinds of messages:
 *   - `kind: "dapp"`  → {@link DappService} (EIP-1193 from content scripts)
 *   - wallet UI        → {@link WalletService} + approvals (popup + approval window)
 * Secret material never leaves this worker.
 */
export default defineBackground(() => {
  const wallet = new WalletService();
  const approvals = new ApprovalService();
  const dapp = new DappService(wallet, approvals);

  // When the idle timer auto-locks, tell connected dapps the account went away.
  wallet.setOnAutoLock(() => void dapp.emitAccountsChanged());

  async function handleWallet(req: WalletRequest): Promise<unknown> {
    switch (req.type) {
      case "getState":
        return wallet.state();
      case "generateSeedPhrase":
        return wallet.generateSeedPhrase();
      case "createVault":
        return wallet.createVault({ password: req.password, mnemonic: req.mnemonic });
      case "unlock":
        await wallet.unlock(req.password);
        await dapp.emitAccountsChanged();
        return;
      case "lock":
        wallet.lock();
        await dapp.emitAccountsChanged();
        return;
      case "addAccount":
        return wallet.addAccount(req.label);
      case "selectAccount":
        await wallet.selectAccount(req.index);
        await dapp.emitAccountsChanged();
        return;
      case "exportMnemonic":
        return wallet.exportMnemonic(req.password);
      case "resetWallet":
        await wallet.resetWallet();
        await dapp.emitAccountsChanged();
        return;
      case "listChains":
        return wallet.listChains();
      case "selectChain":
        await wallet.selectChain(req.chainId);
        await dapp.emitChainChanged();
        return;
      case "addCustomChain":
        return wallet.addCustomChain(req.input);
      case "removeCustomChain":
        return wallet.removeCustomChain(req.chainId);
      case "getBalances":
        return wallet.getBalances();
      case "estimateSend":
        return wallet.estimateSend(req.to, req.amount, req.asset);
      case "send":
        return wallet.send(req.to, req.amount, req.asset);
      case "getApproval": {
        const payload = approvals.get(req.id);
        if (!payload) throw new Error("Approval request not found or already handled");
        return payload;
      }
      case "resolveApproval":
        approvals.settle(req.id, req.approved);
        return;
    }
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const maybeDapp = message as { kind?: string; method?: string; params?: unknown[] };
    if (maybeDapp?.kind === "dapp") {
      const origin = sender.origin ?? safeOrigin(sender.url);
      dapp.handle(origin, maybeDapp.method!, maybeDapp.params ?? []).then(
        (result) => sendResponse({ result }),
        (error: unknown) => sendResponse({ error: dapp.toRpcError(error) }),
      );
      return true;
    }

    const req = message as WalletRequest;
    if (wallet.isUnlocked()) wallet.scheduleAutoLock();
    handleWallet(req).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    );
    return true;
  });
});
