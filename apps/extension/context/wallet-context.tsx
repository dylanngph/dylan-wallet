import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AccountMeta } from "@dylan-wallet/core";
import { useWalletState } from "../hooks/queries";
import type { WalletState } from "../lib/messaging";

interface WalletContextValue {
  state: WalletState | undefined;
  isPending: boolean;
  /** The currently selected account, or the first one as a fallback. */
  selectedAccount: AccountMeta | undefined;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

/**
 * Shares the wallet snapshot (from the `getState` query) across the tree so
 * screens read it via {@link useWallet} instead of re-querying or prop-drilling.
 * TanStack Query remains the source of truth; this just exposes derived values.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { data: state, isPending } = useWalletState();

  const selectedAccount = useMemo(
    () => state?.accounts.find((a) => a.index === state.selectedIndex) ?? state?.accounts[0],
    [state],
  );

  const value = useMemo<WalletContextValue>(
    () => ({ state, isPending, selectedAccount }),
    [state, isPending, selectedAccount],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
