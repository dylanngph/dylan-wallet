import type { Address } from "viem";
import { generateMnemonic, mnemonicToAccount, type HDAccount } from "viem/accounts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import type { KeyValueStore } from "../storage/types.js";
import { decryptVault, encryptVault, type VaultData } from "../crypto/vault.js";

const VAULT_KEY = "keyring.vault";
const META_KEY = "keyring.meta";

/** Public, non-secret metadata for one derived account. */
export interface AccountMeta {
  /** BIP-44 address index — the `i` in `m/44'/60'/0'/0/i`. */
  index: number;
  address: Address;
  label: string;
}

interface KeyringMeta {
  accounts: AccountMeta[];
  selectedIndex: number;
}

export interface CreateVaultOptions {
  password: string;
  /** Import an existing seed; omit to generate a fresh 12-word mnemonic. */
  mnemonic?: string;
}

/**
 * Custodies the wallet's secret material. A single BIP-39 mnemonic is encrypted
 * at rest; every account is an HD derivation (`m/44'/60'/0'/0/i`) compatible with
 * MetaMask. The plaintext mnemonic lives only in memory while unlocked and is
 * wiped on {@link Keyring.lock}. Account metadata (addresses, labels) is public
 * and persisted unencrypted so the UI can render while locked.
 */
export class Keyring {
  #store: KeyValueStore;
  #mnemonic: string | null = null;
  #signers = new Map<number, HDAccount>();

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  /** Whether a vault has been created (independent of lock state). */
  async isInitialized(): Promise<boolean> {
    return (await this.#store.get<string>(VAULT_KEY)) !== undefined;
  }

  isUnlocked(): boolean {
    return this.#mnemonic !== null;
  }

  /**
   * Create the vault from a new or imported mnemonic, persist it encrypted, and
   * leave the keyring unlocked with the first account (index 0) added.
   */
  async createVault(options: CreateVaultOptions): Promise<void> {
    if (await this.isInitialized()) {
      throw new Error("A vault already exists");
    }
    const mnemonic = options.mnemonic?.trim() ?? generateMnemonic(wordlist);
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error("Invalid recovery phrase");
    }

    const vault: VaultData = { version: 1, mnemonic };
    await this.#store.set(VAULT_KEY, await encryptVault(options.password, vault));

    this.#mnemonic = mnemonic;
    this.#signers.clear();
    const first = this.#deriveMeta(0, "Account 1");
    await this.#writeMeta({ accounts: [first], selectedIndex: 0 });
  }

  /** Decrypt the vault into memory. Throws on a wrong password. */
  async unlock(password: string): Promise<void> {
    const ciphertext = await this.#store.get<string>(VAULT_KEY);
    if (!ciphertext) throw new Error("No vault to unlock");
    const vault = await decryptVault(password, ciphertext);
    this.#mnemonic = vault.mnemonic;
    this.#signers.clear();
  }

  /** Wipe all secret material from memory. */
  lock(): void {
    this.#mnemonic = null;
    this.#signers.clear();
  }

  async getAccounts(): Promise<AccountMeta[]> {
    return (await this.#readMeta()).accounts;
  }

  async getSelectedAccount(): Promise<AccountMeta | undefined> {
    const meta = await this.#readMeta();
    return meta.accounts.find((a) => a.index === meta.selectedIndex) ?? meta.accounts[0];
  }

  async selectAccount(index: number): Promise<void> {
    const meta = await this.#readMeta();
    if (!meta.accounts.some((a) => a.index === index)) {
      throw new Error(`Account ${index} does not exist`);
    }
    await this.#writeMeta({ ...meta, selectedIndex: index });
  }

  /** Derive and persist the next sequential HD account. Requires unlock. */
  async addAccount(label?: string): Promise<AccountMeta> {
    this.#requireUnlocked();
    const meta = await this.#readMeta();
    const nextIndex = meta.accounts.reduce((max, a) => Math.max(max, a.index), -1) + 1;
    const account = this.#deriveMeta(nextIndex, label ?? `Account ${nextIndex + 1}`);
    await this.#writeMeta({ ...meta, accounts: [...meta.accounts, account] });
    return account;
  }

  async setLabel(index: number, label: string): Promise<void> {
    const meta = await this.#readMeta();
    const accounts = meta.accounts.map((a) => (a.index === index ? { ...a, label } : a));
    await this.#writeMeta({ ...meta, accounts });
  }

  /**
   * The viem signer for an account, by address. Requires unlock. Use the
   * returned account's `signMessage` / `signTransaction` / `signTypedData`.
   */
  async getSigner(address: Address): Promise<HDAccount> {
    this.#requireUnlocked();
    const meta = await this.#readMeta();
    const found = meta.accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    );
    if (!found) throw new Error(`No account for address ${address}`);
    return this.#signerForIndex(found.index);
  }

  /** Reveal the mnemonic after re-authenticating with the password. */
  async exportMnemonic(password: string): Promise<string> {
    const ciphertext = await this.#store.get<string>(VAULT_KEY);
    if (!ciphertext) throw new Error("No vault exists");
    return (await decryptVault(password, ciphertext)).mnemonic;
  }

  /** Re-encrypt the vault under a new password. Requires the current password. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const ciphertext = await this.#store.get<string>(VAULT_KEY);
    if (!ciphertext) throw new Error("No vault exists");
    const vault = await decryptVault(currentPassword, ciphertext);
    await this.#store.set(VAULT_KEY, await encryptVault(newPassword, vault));
  }

  #requireUnlocked(): string {
    if (this.#mnemonic === null) throw new Error("Keyring is locked");
    return this.#mnemonic;
  }

  #signerForIndex(index: number): HDAccount {
    const cached = this.#signers.get(index);
    if (cached) return cached;
    const account = mnemonicToAccount(this.#requireUnlocked(), { addressIndex: index });
    this.#signers.set(index, account);
    return account;
  }

  #deriveMeta(index: number, label: string): AccountMeta {
    return { index, address: this.#signerForIndex(index).address, label };
  }

  async #readMeta(): Promise<KeyringMeta> {
    return (await this.#store.get<KeyringMeta>(META_KEY)) ?? { accounts: [], selectedIndex: 0 };
  }

  async #writeMeta(meta: KeyringMeta): Promise<void> {
    await this.#store.set(META_KEY, meta);
  }
}
