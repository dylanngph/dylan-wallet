import { browser } from "#imports";
import type { AccountMeta, CustomChainInput } from "@dylan-wallet/core";
import type { Address } from "viem";

/** Serializable chain summary (viem `Chain` objects carry functions). */
export interface ChainSummary {
  id: number;
  name: string;
  nativeSymbol: string;
  testnet: boolean;
  isCustom: boolean;
}

/** A balance row for the UI. `balance` is base units as a string (bigint-safe). */
export interface BalanceView {
  kind: "native" | "erc20";
  address?: Address;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

export interface BalancesResult {
  native: BalanceView;
  tokens: BalanceView[];
}

/** What to send: native currency or an ERC-20 (decimals provided by the UI). */
export type SendAsset = { kind: "native" } | { kind: "erc20"; token: Address; decimals: number };

/** Snapshot of wallet status the popup renders from. */
export interface WalletState {
  initialized: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  selectedIndex: number | null;
  selectedChainId: number;
}

/** Messages the popup sends to the background (the trust boundary). */
export type WalletRequest =
  | { type: "getState" }
  | { type: "generateSeedPhrase" }
  | { type: "createVault"; password: string; mnemonic?: string }
  | { type: "unlock"; password: string }
  | { type: "lock" }
  | { type: "addAccount"; label?: string }
  | { type: "selectAccount"; index: number }
  | { type: "exportMnemonic"; password: string }
  | { type: "listChains" }
  | { type: "selectChain"; chainId: number }
  | { type: "addCustomChain"; input: CustomChainInput }
  | { type: "removeCustomChain"; chainId: number }
  | { type: "getBalances" }
  | { type: "estimateSend"; to: Address; amount: string; asset: SendAsset }
  | { type: "send"; to: Address; amount: string; asset: SendAsset };

/** Background reply envelope. */
export type WalletResponse = { ok: true; data: unknown } | { ok: false; error: string };

/** Map each request to its resolved data type. */
export interface WalletResultMap {
  getState: WalletState;
  generateSeedPhrase: string;
  createVault: void;
  unlock: void;
  lock: void;
  addAccount: AccountMeta;
  selectAccount: void;
  exportMnemonic: string;
  listChains: ChainSummary[];
  selectChain: void;
  addCustomChain: void;
  removeCustomChain: void;
  getBalances: BalancesResult;
  estimateSend: { gas: string; total: string };
  send: { hash: string };
}

/** Popup-side: send a request to the background and unwrap the result. */
export async function sendMessage<T extends WalletRequest["type"]>(
  req: Extract<WalletRequest, { type: T }>,
): Promise<WalletResultMap[T]> {
  const res = (await browser.runtime.sendMessage(req)) as WalletResponse;
  if (!res.ok) throw new Error(res.error);
  return res.data as WalletResultMap[T];
}
