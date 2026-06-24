import { browser } from "#imports";
import {
  BUILTIN_CHAINS,
  ChainRegistry,
  DEFAULT_CHAIN_ID,
  Keyring,
  TokenRegistry,
  estimateTransferFee,
  executeTransfer,
  generateRecoveryPhrase,
  getErc20Balances,
  getNativeBalance,
  getPublicClient,
  getWalletClient,
  prepareTransfer,
  type AccountMeta,
  type CreateVaultOptions,
  type CustomChainInput,
  type TransferAsset,
} from "@dylan-wallet/core";
import { mainnet } from "viem/chains";
import type { Account, Address, Chain, PublicClient, WalletClient } from "viem";
import { ExtensionStore } from "./store";
import type {
  BalancesResult,
  BalanceView,
  ChainSummary,
  SendAsset,
  WalletState,
} from "../lib/messaging";

const SELECTED_CHAIN_KEY = "chains.selected";
const AUTO_LOCK_ALARM = "dylan:auto-lock";
const AUTO_LOCK_MINUTES = 15;

/**
 * The wallet's domain layer: owns the {@link Keyring}, chain/token registries,
 * and all read/transfer logic. Framework-agnostic core does the heavy lifting;
 * this class adapts it to the extension (chrome.storage, alarm-based auto-lock).
 * It does NOT know about dapps or messaging — the background wires those.
 */
export class WalletService {
  readonly store = new ExtensionStore();
  readonly keyring = new Keyring(this.store);
  readonly chains = new ChainRegistry(this.store);
  readonly tokens = new TokenRegistry(this.store);
  #onAutoLock: () => void = () => {};

  constructor() {
    // Auto-lock via alarms survives the MV3 service worker being suspended.
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== AUTO_LOCK_ALARM) return;
      this.keyring.lock();
      this.#onAutoLock();
    });
  }

  /** Notified when the idle timer locks the wallet (so dapps can be told). */
  setOnAutoLock(listener: () => void) {
    this.#onAutoLock = listener;
  }

  scheduleAutoLock() {
    void browser.alarms.create(AUTO_LOCK_ALARM, { delayInMinutes: AUTO_LOCK_MINUTES });
  }
  #clearAutoLock() {
    void browser.alarms.clear(AUTO_LOCK_ALARM);
  }

  // ── snapshot ────────────────────────────────────────────────────────────────
  async state(): Promise<WalletState> {
    return {
      initialized: await this.keyring.isInitialized(),
      unlocked: this.keyring.isUnlocked(),
      accounts: await this.keyring.getAccounts(),
      selectedIndex: (await this.keyring.getSelectedAccount())?.index ?? null,
      selectedChainId: await this.selectedChainId(),
    };
  }

  isUnlocked() {
    return this.keyring.isUnlocked();
  }
  isInitialized() {
    return this.keyring.isInitialized();
  }

  async selectedChainId(): Promise<number> {
    return (await this.store.get<number>(SELECTED_CHAIN_KEY)) ?? DEFAULT_CHAIN_ID;
  }
  async activeChain(): Promise<Chain> {
    return (await this.chains.getById(await this.selectedChainId())) ?? mainnet;
  }
  async selectedAddress(): Promise<Address> {
    const account = await this.keyring.getSelectedAccount();
    if (!account) throw new Error("No account selected");
    return account.address;
  }

  // ── lifecycle ───────────────────────────────────────────────────────────────
  generateSeedPhrase() {
    return generateRecoveryPhrase();
  }
  async createVault(options: CreateVaultOptions) {
    await this.keyring.createVault(options);
    this.scheduleAutoLock();
  }
  async unlock(password: string) {
    await this.keyring.unlock(password);
    this.scheduleAutoLock();
  }
  lock() {
    this.#clearAutoLock();
    this.keyring.lock();
  }
  addAccount(label?: string): Promise<AccountMeta> {
    return this.keyring.addAccount(label);
  }
  selectAccount(index: number) {
    return this.keyring.selectAccount(index);
  }
  exportMnemonic(password: string) {
    return this.keyring.exportMnemonic(password);
  }

  // ── chains ──────────────────────────────────────────────────────────────────
  async listChains(): Promise<ChainSummary[]> {
    const list = await this.chains.list();
    const builtinIds = new Set(BUILTIN_CHAINS.map((c) => c.id));
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      nativeSymbol: c.nativeCurrency.symbol,
      testnet: c.testnet ?? false,
      isCustom: !builtinIds.has(c.id),
    }));
  }
  async selectChain(chainId: number) {
    await this.store.set(SELECTED_CHAIN_KEY, chainId);
  }
  addCustomChain(input: CustomChainInput) {
    return this.chains.addCustom(input);
  }
  removeCustomChain(chainId: number) {
    return this.chains.removeCustom(chainId);
  }

  // ── balances + transfers ──────────────────────────────────────────────────
  async getBalances(): Promise<BalancesResult> {
    const chain = await this.activeChain();
    const client = getPublicClient(chain);
    const owner = await this.selectedAddress();
    const native = await getNativeBalance(client, owner);
    const tokenList = await this.tokens.listForChain(chain.id);
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

  #toTransferAsset(asset: SendAsset, chain: Chain): TransferAsset {
    return asset.kind === "native"
      ? { kind: "native", decimals: chain.nativeCurrency.decimals }
      : { kind: "erc20", token: asset.token, decimals: asset.decimals };
  }

  async estimateSend(to: Address, amount: string, asset: SendAsset) {
    const chain = await this.activeChain();
    const client = getPublicClient(chain);
    const prepared = prepareTransfer({
      asset: this.#toTransferAsset(asset, chain),
      recipient: to,
      amount,
    });
    const fee = await estimateTransferFee(client, await this.selectedAddress(), prepared);
    return { gas: fee.gas.toString(), total: fee.total.toString() };
  }

  async send(to: Address, amount: string, asset: SendAsset) {
    const chain = await this.activeChain();
    const signer = await this.keyring.getSigner(await this.selectedAddress());
    const walletClient = getWalletClient(signer, chain);
    const prepared = prepareTransfer({
      asset: this.#toTransferAsset(asset, chain),
      recipient: to,
      amount,
    });
    return { hash: await executeTransfer(walletClient, prepared) };
  }

  // ── signing primitives (used by the dapp service) ──────────────────────────
  getSigner(address: Address) {
    return this.keyring.getSigner(address);
  }
  publicClient(chain: Chain): PublicClient {
    return getPublicClient(chain);
  }
  walletClient(signer: Account, chain: Chain): WalletClient {
    return getWalletClient(signer, chain);
  }
}
