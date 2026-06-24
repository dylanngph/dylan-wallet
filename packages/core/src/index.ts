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
