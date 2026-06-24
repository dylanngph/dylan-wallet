import { defineBackground, browser } from "#imports";
import {
  BUILTIN_CHAINS,
  ChainRegistry,
  DEFAULT_CHAIN_ID,
  Keyring,
  TokenRegistry,
  estimateTransferFee,
  executeTransfer,
  generateRecoveryPhrase,
  getNativeBalance,
  getErc20Balances,
  getPublicClient,
  getWalletClient,
  prepareTransfer,
  type TransferAsset,
} from "@dylan-wallet/core";
import { mainnet } from "viem/chains";
import { hexToString, toHex, type Address, type Chain, type Hex } from "viem";
import { ExtensionStore } from "../lib/storage";
import type {
  BalancesResult,
  BalanceView,
  ChainSummary,
  WalletRequest,
  WalletState,
} from "../lib/messaging";
import {
  type ApprovalPayload,
  type DappTx,
  type ProviderEvent,
  ProviderError,
  ProviderErrors,
} from "../lib/dapp-protocol";

const AUTO_LOCK_MS = 15 * 60 * 1000;
const SELECTED_CHAIN_KEY = "chains.selected";
const CONNECTIONS_KEY = "dapp.connections";

function safeOrigin(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

const userRejected = () =>
  new ProviderError(ProviderErrors.userRejected.code, ProviderErrors.userRejected.message);

export default defineBackground(() => {
  const store = new ExtensionStore();
  const keyring = new Keyring(store);
  const chains = new ChainRegistry(store);
  const tokens = new TokenRegistry(store);
  let autoLockTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleAutoLock() {
    if (autoLockTimer) clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => keyring.lock(), AUTO_LOCK_MS);
  }

  // ── chain / account helpers ────────────────────────────────────────────────
  const selectedChainId = async () =>
    (await store.get<number>(SELECTED_CHAIN_KEY)) ?? DEFAULT_CHAIN_ID;
  const activeChain = async (): Promise<Chain> =>
    (await chains.getById(await selectedChainId())) ?? mainnet;
  async function selectedAddress(): Promise<Address> {
    const account = await keyring.getSelectedAccount();
    if (!account) throw new Error("No account selected");
    return account.address;
  }

  // ── approval manager ───────────────────────────────────────────────────────
  interface PendingApproval {
    payload: ApprovalPayload;
    resolve: (approved: boolean) => void;
    windowId?: number;
  }
  const approvals = new Map<string, PendingApproval>();
  let approvalSeq = 0;

  function requestApproval(payload: ApprovalPayload): Promise<boolean> {
    const id = `${Date.now()}-${approvalSeq++}`;
    return new Promise<boolean>((resolve) => {
      approvals.set(id, { payload, resolve });
      void browser.windows
        .create({
          url: browser.runtime.getURL(`/approval.html?id=${id}`),
          type: "popup",
          width: 380,
          height: 620,
          focused: true,
        })
        .then((win) => {
          const entry = approvals.get(id);
          if (entry && win?.id !== undefined) entry.windowId = win.id;
        });
    });
  }

  function settleApproval(id: string, approved: boolean) {
    const entry = approvals.get(id);
    if (!entry) return;
    approvals.delete(id);
    entry.resolve(approved);
    if (entry.windowId !== undefined) {
      void browser.windows.remove(entry.windowId).catch(() => {});
    }
  }

  // A user closing the approval window counts as a rejection.
  browser.windows.onRemoved.addListener((windowId) => {
    for (const [id, entry] of approvals) {
      if (entry.windowId === windowId) {
        entry.resolve(false);
        approvals.delete(id);
      }
    }
  });

  // ── dapp connections + events ──────────────────────────────────────────────
  const getConnections = async () => (await store.get<string[]>(CONNECTIONS_KEY)) ?? [];
  const isConnected = async (origin: string) => (await getConnections()).includes(origin);
  async function addConnection(origin: string) {
    const current = await getConnections();
    if (!current.includes(origin)) await store.set(CONNECTIONS_KEY, [...current, origin]);
  }

  async function broadcast(event: ProviderEvent) {
    const connected = new Set(await getConnections());
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined || !connected.has(safeOrigin(tab.url))) continue;
      void browser.tabs.sendMessage(tab.id, { kind: "dapp-event", event }).catch(() => {});
    }
  }
  async function emitAccountsChanged() {
    const address = keyring.isUnlocked() ? (await keyring.getSelectedAccount())?.address : undefined;
    await broadcast({ type: "accountsChanged", accounts: address ? [address] : [] });
  }
  async function emitChainChanged() {
    await broadcast({ type: "chainChanged", chainId: toHex(await selectedChainId()) });
  }

  async function requireConnected(origin: string) {
    if (!(await isConnected(origin))) {
      throw new ProviderError(ProviderErrors.unauthorized.code, ProviderErrors.unauthorized.message);
    }
  }

  // ── EIP-1193 request routing ───────────────────────────────────────────────
  async function handleDapp(origin: string, method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts": {
        if (!(await keyring.isInitialized())) {
          throw new ProviderError(ProviderErrors.unauthorized.code, "Wallet is not set up yet");
        }
        if ((await isConnected(origin)) && keyring.isUnlocked()) {
          return [await selectedAddress()];
        }
        if (!(await requestApproval({ type: "connect", origin }))) throw userRejected();
        await addConnection(origin);
        await emitAccountsChanged();
        await broadcast({ type: "connect", chainId: toHex(await selectedChainId()) });
        return [await selectedAddress()];
      }
      case "eth_accounts":
        return (await isConnected(origin)) && keyring.isUnlocked() ? [await selectedAddress()] : [];
      case "eth_chainId":
        return toHex(await selectedChainId());
      case "net_version":
        return String(await selectedChainId());

      case "wallet_switchEthereumChain": {
        const target = Number((params[0] as { chainId: string }).chainId);
        if (!(await chains.getById(target))) {
          throw new ProviderError(
            ProviderErrors.chainNotAdded.code,
            ProviderErrors.chainNotAdded.message,
          );
        }
        await store.set(SELECTED_CHAIN_KEY, target);
        await emitChainChanged();
        return null;
      }

      case "personal_sign": {
        await requireConnected(origin);
        const [messageHex, address] = params as [Hex, Address];
        let message = messageHex;
        try {
          message = hexToString(messageHex) as Hex;
        } catch {
          /* keep raw hex if it isn't UTF-8 text */
        }
        if (!(await requestApproval({ type: "signMessage", origin, address, message }))) {
          throw userRejected();
        }
        const signer = await keyring.getSigner(address);
        return signer.signMessage({ message: { raw: messageHex } });
      }

      case "eth_signTypedData_v4": {
        await requireConnected(origin);
        const [address, json] = params as [Address, string];
        if (!(await requestApproval({ type: "signTypedData", origin, address, typedData: json }))) {
          throw userRejected();
        }
        const signer = await keyring.getSigner(address);
        return signer.signTypedData(JSON.parse(json));
      }

      case "eth_sendTransaction": {
        await requireConnected(origin);
        const tx = (params[0] ?? {}) as DappTx;
        if (!(await requestApproval({ type: "sendTransaction", origin, tx }))) throw userRejected();
        const chain = await activeChain();
        const from = tx.from ?? (await selectedAddress());
        const signer = await keyring.getSigner(from);
        const walletClient = getWalletClient(signer, chain);
        return walletClient.sendTransaction({
          account: signer,
          chain,
          to: tx.to,
          value: tx.value ? BigInt(tx.value) : undefined,
          data: tx.data as Hex | undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
        });
      }

      case "eth_sign":
        throw new ProviderError(ProviderErrors.unsupported.code, "eth_sign is not supported");

      default: {
        // Read-only passthrough to the active chain's RPC.
        const client = getPublicClient(await activeChain());
        return client.request({ method, params } as never);
      }
    }
  }

  // ── wallet-UI request routing (popup + approval window) ─────────────────────
  async function handle(req: WalletRequest): Promise<unknown> {
    switch (req.type) {
      case "getState":
        return {
          initialized: await keyring.isInitialized(),
          unlocked: keyring.isUnlocked(),
          accounts: await keyring.getAccounts(),
          selectedIndex: (await keyring.getSelectedAccount())?.index ?? null,
          selectedChainId: await selectedChainId(),
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
        await emitAccountsChanged();
        return;
      case "lock":
        if (autoLockTimer) clearTimeout(autoLockTimer);
        keyring.lock();
        await emitAccountsChanged();
        return;
      case "addAccount":
        return keyring.addAccount(req.label);
      case "selectAccount":
        await keyring.selectAccount(req.index);
        await emitAccountsChanged();
        return;
      case "exportMnemonic":
        return keyring.exportMnemonic(req.password);

      case "listChains": {
        const list = await chains.list();
        const builtinIds = new Set(BUILTIN_CHAINS.map((c) => c.id));
        const customIds = new Set(list.filter((c) => !builtinIds.has(c.id)).map((c) => c.id));
        return list.map(
          (c): ChainSummary => ({
            id: c.id,
            name: c.name,
            nativeSymbol: c.nativeCurrency.symbol,
            testnet: c.testnet ?? false,
            isCustom: customIds.has(c.id),
          }),
        );
      }
      case "selectChain":
        await store.set(SELECTED_CHAIN_KEY, req.chainId);
        await emitChainChanged();
        return;
      case "addCustomChain":
        await chains.addCustom(req.input);
        return;
      case "removeCustomChain":
        await chains.removeCustom(req.chainId);
        return;

      case "getBalances":
        return getBalances();
      case "estimateSend": {
        const chain = await activeChain();
        const client = getPublicClient(chain);
        const prepared = prepareTransfer({
          asset: toTransferAsset(req.asset, chain),
          recipient: req.to,
          amount: req.amount,
        });
        const fee = await estimateTransferFee(client, await selectedAddress(), prepared);
        return { gas: fee.gas.toString(), total: fee.total.toString() };
      }
      case "send": {
        const chain = await activeChain();
        const from = await selectedAddress();
        const signer = await keyring.getSigner(from);
        const walletClient = getWalletClient(signer, chain);
        const prepared = prepareTransfer({
          asset: toTransferAsset(req.asset, chain),
          recipient: req.to,
          amount: req.amount,
        });
        return { hash: await executeTransfer(walletClient, prepared) };
      }

      case "getApproval": {
        const entry = approvals.get(req.id);
        if (!entry) throw new Error("Approval request not found or already handled");
        return entry.payload;
      }
      case "resolveApproval":
        settleApproval(req.id, req.approved);
        return;
    }
  }

  function toTransferAsset(
    asset: Extract<WalletRequest, { type: "send" }>["asset"],
    chain: Chain,
  ): TransferAsset {
    return asset.kind === "native"
      ? { kind: "native", decimals: chain.nativeCurrency.decimals }
      : { kind: "erc20", token: asset.token, decimals: asset.decimals };
  }

  async function getBalances(): Promise<BalancesResult> {
    const chain = await activeChain();
    const client = getPublicClient(chain);
    const owner = await selectedAddress();
    const native = await getNativeBalance(client, owner);
    const tokenList = await tokens.listForChain(chain.id);
    const tokenBalances = await getErc20Balances(
      client,
      owner,
      tokenList.map((t) => t.address),
    );
    return {
      native: {
        kind: "native",
        symbol: native.symbol,
        name: chain.nativeCurrency.name,
        decimals: native.decimals,
        balance: native.balance.toString(),
      },
      tokens: tokenBalances.map(
        (t): BalanceView => ({
          kind: "erc20",
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          balance: t.balance.toString(),
        }),
      ),
    };
  }

  // ── message router ──────────────────────────────────────────────────────────
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const dapp = message as { kind?: string; method?: string; params?: unknown[] };
    if (dapp?.kind === "dapp") {
      const origin = sender.origin ?? safeOrigin(sender.url);
      handleDapp(origin, dapp.method!, dapp.params ?? []).then(
        (result) => sendResponse({ result }),
        (error: unknown) =>
          sendResponse({
            error:
              error instanceof ProviderError
                ? { code: error.code, message: error.message }
                : { code: -32603, message: error instanceof Error ? error.message : String(error) },
          }),
      );
      return true;
    }

    const req = message as WalletRequest;
    if (keyring.isUnlocked()) scheduleAutoLock();
    handle(req).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
    return true;
  });
});
