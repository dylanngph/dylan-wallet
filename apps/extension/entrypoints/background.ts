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
import type { Address, Chain } from "viem";
import { ExtensionStore } from "../lib/storage";
import type {
  BalancesResult,
  BalanceView,
  ChainSummary,
  WalletRequest,
  WalletState,
} from "../lib/messaging";

const AUTO_LOCK_MS = 15 * 60 * 1000;
const SELECTED_CHAIN_KEY = "chains.selected";

/**
 * The background service worker is the wallet's trust boundary: the only context
 * holding the unlocked {@link Keyring}. The popup talks to it over
 * `runtime.sendMessage`; secret material never leaves this worker.
 */
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

  async function selectedChainId(): Promise<number> {
    return (await store.get<number>(SELECTED_CHAIN_KEY)) ?? DEFAULT_CHAIN_ID;
  }

  async function activeChain(): Promise<Chain> {
    return (await chains.getById(await selectedChainId())) ?? mainnet;
  }

  async function selectedAddress(): Promise<Address> {
    const account = await keyring.getSelectedAccount();
    if (!account) throw new Error("No account selected");
    return account.address;
  }

  function toSummary(chain: Chain, customIds: Set<number>): ChainSummary {
    return {
      id: chain.id,
      name: chain.name,
      nativeSymbol: chain.nativeCurrency.symbol,
      testnet: chain.testnet ?? false,
      isCustom: customIds.has(chain.id),
    };
  }

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

      case "listChains": {
        const list = await chains.list();
        const builtinIds = new Set(BUILTIN_CHAINS.map((c) => c.id));
        const customIds = new Set(
          list.filter((c) => !builtinIds.has(c.id)).map((c) => c.id),
        );
        return list.map((c) => toSummary(c, customIds));
      }
      case "selectChain":
        await store.set(SELECTED_CHAIN_KEY, req.chainId);
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
        const { client, from } = await readContext();
        const prepared = prepareTransfer({
          asset: toTransferAsset(req.asset, await activeChain()),
          recipient: req.to,
          amount: req.amount,
        });
        const fee = await estimateTransferFee(client, from, prepared);
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
        const hash = await executeTransfer(walletClient, prepared);
        return { hash };
      }
    }
  }

  async function readContext() {
    const chain = await activeChain();
    return { chain, client: getPublicClient(chain), from: await selectedAddress() };
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

    const nativeView: BalanceView = {
      kind: "native",
      symbol: native.symbol,
      name: chain.nativeCurrency.name,
      decimals: native.decimals,
      balance: native.balance.toString(),
    };
    const tokenViews: BalanceView[] = tokenBalances.map((t) => ({
      kind: "erc20",
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      balance: t.balance.toString(),
    }));
    return { native: nativeView, tokens: tokenViews };
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
