import { getAddress, type Address } from "viem";
import type { KeyValueStore } from "../storage/types.js";
import type { TokenInfo } from "./types.js";

/**
 * A small curated set of well-known tokens shown by default. On-chain
 * symbol/decimals are authoritative (fetched in {@link getErc20Balances}); this
 * list only seeds which token addresses to query.
 */
export const DEFAULT_TOKENS: TokenInfo[] = [
  { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { chainId: 42161, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { chainId: 10, address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { chainId: 137, address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
];

const CUSTOM_TOKENS_KEY = "tokens.custom";

/**
 * Tracks which ERC-20 tokens to display per chain: a curated default set plus
 * any tokens the user adds (persisted via the injected {@link KeyValueStore}).
 */
export class TokenRegistry {
  #store: KeyValueStore;
  #custom: TokenInfo[] | null = null;

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  async #load(): Promise<TokenInfo[]> {
    if (this.#custom === null) {
      this.#custom = (await this.#store.get<TokenInfo[]>(CUSTOM_TOKENS_KEY)) ?? [];
    }
    return this.#custom;
  }

  /** Token addresses to query for a chain (defaults + custom, de-duplicated). */
  async listForChain(chainId: number): Promise<TokenInfo[]> {
    const custom = await this.#load();
    const all = [...DEFAULT_TOKENS, ...custom].filter((t) => t.chainId === chainId);
    const seen = new Set<string>();
    return all.filter((t) => {
      const key = t.address.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Add (or replace) a custom token and persist. Address is checksummed. */
  async addCustom(token: TokenInfo): Promise<void> {
    const custom = await this.#load();
    const address = getAddress(token.address);
    this.#custom = [
      ...custom.filter(
        (t) => !(t.chainId === token.chainId && t.address.toLowerCase() === address.toLowerCase()),
      ),
      { ...token, address },
    ];
    await this.#store.set(CUSTOM_TOKENS_KEY, this.#custom);
  }

  /** Remove a custom token (defaults can't be removed). */
  async removeCustom(chainId: number, address: Address): Promise<void> {
    const custom = await this.#load();
    this.#custom = custom.filter(
      (t) => !(t.chainId === chainId && t.address.toLowerCase() === address.toLowerCase()),
    );
    await this.#store.set(CUSTOM_TOKENS_KEY, this.#custom);
  }
}
