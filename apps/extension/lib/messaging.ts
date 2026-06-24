import { browser } from "#imports";
import type { AccountMeta } from "@dylan-wallet/core";

/** Snapshot of wallet status the popup renders from. */
export interface WalletState {
  initialized: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  selectedIndex: number | null;
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
  | { type: "exportMnemonic"; password: string };

/** Background reply envelope. */
export type WalletResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

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
}

/** Popup-side: send a request to the background and unwrap the result. */
export async function sendMessage<T extends WalletRequest["type"]>(
  req: Extract<WalletRequest, { type: T }>,
): Promise<WalletResultMap[T]> {
  const res = (await browser.runtime.sendMessage(req)) as WalletResponse;
  if (!res.ok) throw new Error(res.error);
  return res.data as WalletResultMap[T];
}
