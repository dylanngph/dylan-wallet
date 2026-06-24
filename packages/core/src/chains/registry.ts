import { type Chain, defineChain } from "viem";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import type { KeyValueStore } from "../storage/types.js";

/** Chains shipped by default, in display order. */
export const BUILTIN_CHAINS: readonly Chain[] = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  sepolia,
];

/** The chain selected on first run. */
export const DEFAULT_CHAIN_ID = mainnet.id;

/** User-supplied definition for an arbitrary EVM chain (custom RPC). */
export interface CustomChainInput {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  blockExplorerUrl?: string;
  testnet?: boolean;
}

/** Build a viem {@link Chain} from a {@link CustomChainInput}. */
export function toViemChain(input: CustomChainInput): Chain {
  return defineChain({
    id: input.id,
    name: input.name,
    nativeCurrency: input.nativeCurrency,
    rpcUrls: { default: { http: [input.rpcUrl] } },
    blockExplorers: input.blockExplorerUrl
      ? { default: { name: input.name, url: input.blockExplorerUrl } }
      : undefined,
    testnet: input.testnet,
  });
}

const CUSTOM_CHAINS_KEY = "chains.custom";

/**
 * Resolves the active set of chains: built-ins plus any custom EVM chains the
 * user has added (persisted via the injected {@link KeyValueStore}). Custom
 * chains override a built-in with the same id.
 */
export class ChainRegistry {
  #store: KeyValueStore;
  #custom: CustomChainInput[] = [];
  #loaded = false;

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  async #ensureLoaded(): Promise<void> {
    if (this.#loaded) return;
    this.#custom = (await this.#store.get<CustomChainInput[]>(CUSTOM_CHAINS_KEY)) ?? [];
    this.#loaded = true;
  }

  /** All available chains (built-ins + custom), custom taking precedence by id. */
  async list(): Promise<Chain[]> {
    await this.#ensureLoaded();
    const customIds = new Set(this.#custom.map((c) => c.id));
    const builtins = BUILTIN_CHAINS.filter((c) => !customIds.has(c.id));
    return [...builtins, ...this.#custom.map(toViemChain)];
  }

  /** Look up a chain by its EIP-155 id, or `undefined` if not registered. */
  async getById(id: number): Promise<Chain | undefined> {
    const all = await this.list();
    return all.find((c) => c.id === id);
  }

  /** Add or replace a custom chain, then persist. */
  async addCustom(input: CustomChainInput): Promise<void> {
    await this.#ensureLoaded();
    this.#custom = [...this.#custom.filter((c) => c.id !== input.id), input];
    await this.#store.set(CUSTOM_CHAINS_KEY, this.#custom);
  }

  /** Remove a custom chain by id (built-ins are not removable). */
  async removeCustom(id: number): Promise<void> {
    await this.#ensureLoaded();
    this.#custom = this.#custom.filter((c) => c.id !== id);
    await this.#store.set(CUSTOM_CHAINS_KEY, this.#custom);
  }

  /** Drop the in-memory cache (e.g. after the underlying store is wiped). */
  invalidate(): void {
    this.#custom = [];
    this.#loaded = false;
  }
}
