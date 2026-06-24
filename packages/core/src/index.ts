// @dylan-wallet/core — framework-agnostic wallet engine.
export const CORE_VERSION = "0.0.0";

// Storage abstraction (host apps inject a concrete backend).
export type { KeyValueStore } from "./storage/types.js";
export { MemoryStore } from "./storage/memory.js";

// Chains: built-ins + custom EVM chain registry.
export {
  BUILTIN_CHAINS,
  DEFAULT_CHAIN_ID,
  ChainRegistry,
  toViemChain,
  type CustomChainInput,
} from "./chains/registry.js";

// Vault encryption.
export { encryptVault, decryptVault, type VaultData } from "./crypto/vault.js";

// Keyring (secret custody + HD account derivation).
export {
  Keyring,
  type AccountMeta,
  type CreateVaultOptions,
} from "./keyring/keyring.js";

// Recovery-phrase helpers (onboarding generate/validate).
export { generateRecoveryPhrase, isValidRecoveryPhrase } from "./mnemonic.js";

// RPC clients.
export { getPublicClient, getWalletClient } from "./rpc/client.js";

// Tokens: balances + registry.
export type { TokenInfo, TokenBalance, NativeBalance } from "./tokens/types.js";
export { getNativeBalance, getErc20Balances } from "./tokens/balances.js";
export { TokenRegistry, DEFAULT_TOKENS } from "./tokens/registry.js";

// Transfers: prepare / estimate / execute.
export {
  prepareTransfer,
  estimateTransferFee,
  executeTransfer,
  type TransferAsset,
  type TransferRequest,
  type PreparedTransfer,
  type FeeEstimate,
} from "./tx/transfer.js";

// Re-export common viem helpers used across the UI.
export { isAddress, formatUnits, parseUnits, getAddress } from "viem";
