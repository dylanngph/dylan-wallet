import { generateMnemonic } from "viem/accounts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

/**
 * Generate a fresh BIP-39 recovery phrase. `strength` is entropy in bits:
 * 128 → 12 words (default), 256 → 24 words.
 */
export function generateRecoveryPhrase(strength: 128 | 256 = 128): string {
  return generateMnemonic(wordlist, strength);
}

/** Validate a BIP-39 recovery phrase against the English wordlist + checksum. */
export function isValidRecoveryPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim(), wordlist);
}
