import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomChainInput } from "@dylan-wallet/core";
import type { Address } from "viem";
import { sendMessage, type SendAsset, type WalletState } from "../lib/messaging";

/** Centralized query keys. Balances are keyed by account + chain so switching
 * either automatically refetches without manual invalidation. */
export const queryKeys = {
  state: ["walletState"] as const,
  chains: ["chains"] as const,
  balances: (account: number | null, chainId: number) =>
    ["balances", account, chainId] as const,
};

// ── Queries ────────────────────────────────────────────────────────────────

export function useWalletState() {
  return useQuery({
    queryKey: queryKeys.state,
    queryFn: () => sendMessage({ type: "getState" }),
  });
}

export function useChains() {
  return useQuery({
    queryKey: queryKeys.chains,
    queryFn: () => sendMessage({ type: "listChains" }),
  });
}

export function useBalances(state: WalletState | undefined) {
  return useQuery({
    queryKey: queryKeys.balances(state?.selectedIndex ?? null, state?.selectedChainId ?? 0),
    queryFn: () => sendMessage({ type: "getBalances" }),
    enabled: Boolean(state?.unlocked) && state?.selectedIndex !== null,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Invalidate wallet state after a mutation; balances refetch via their key. */
function useStateInvalidator() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.state });
}

export function useGenerateSeedPhrase() {
  return useMutation({ mutationFn: () => sendMessage({ type: "generateSeedPhrase" }) });
}

export function useCreateVault() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: (vars: { password: string; mnemonic?: string }) =>
      sendMessage({ type: "createVault", ...vars }),
    onSuccess: invalidate,
  });
}

export function useUnlock() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: (password: string) => sendMessage({ type: "unlock", password }),
    onSuccess: invalidate,
  });
}

export function useLock() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: () => sendMessage({ type: "lock" }),
    onSuccess: invalidate,
  });
}

export function useAddAccount() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: (label?: string) => sendMessage({ type: "addAccount", label }),
    onSuccess: invalidate,
  });
}

export function useSelectAccount() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: (index: number) => sendMessage({ type: "selectAccount", index }),
    onSuccess: invalidate,
  });
}

export function useSelectChain() {
  const invalidate = useStateInvalidator();
  return useMutation({
    mutationFn: (chainId: number) => sendMessage({ type: "selectChain", chainId }),
    onSuccess: invalidate,
  });
}

export function useAddCustomChain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomChainInput) => sendMessage({ type: "addCustomChain", input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chains });
      void qc.invalidateQueries({ queryKey: queryKeys.state });
    },
  });
}

export function useExportMnemonic() {
  return useMutation({
    mutationFn: (password: string) => sendMessage({ type: "exportMnemonic", password }),
  });
}

export function useEstimateSend() {
  return useMutation({
    mutationFn: (vars: { to: Address; amount: string; asset: SendAsset }) =>
      sendMessage({ type: "estimateSend", ...vars }),
  });
}

export function useSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { to: Address; amount: string; asset: SendAsset }) =>
      sendMessage({ type: "send", ...vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["balances"] }),
  });
}

// ── Dapp approval window ─────────────────────────────────────────────────────

export function useApproval(id: string) {
  return useQuery({
    queryKey: ["approval", id],
    queryFn: () => sendMessage({ type: "getApproval", id }),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useResolveApproval() {
  return useMutation({
    mutationFn: (vars: { id: string; approved: boolean }) =>
      sendMessage({ type: "resolveApproval", ...vars }),
  });
}
