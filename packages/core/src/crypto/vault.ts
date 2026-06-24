/**
 * Password-based vault encryption built directly on the platform WebCrypto API
 * (`globalThis.crypto.subtle`) — no third-party crypto dependency. The
 * construction is PBKDF2-SHA256 (key stretching) → AES-256-GCM (authenticated
 * encryption). It runs unchanged in the extension service worker, the web app,
 * and Bun/Node test environments.
 */

/**
 * Decrypted secret material. Only the BIP-39 mnemonic is held — all accounts
 * are derived from it. `version` allows future migration of the vault format.
 */
export interface VaultData {
  version: 1;
  mnemonic: string;
}

/** Serialized, encrypted vault. Persisted as a JSON string. */
interface EncryptedVault {
  version: 1;
  kdf: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64 (AES-GCM output, includes the auth tag)
}

/** OWASP-aligned iteration count (matches MetaMask's hardened default). */
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // 96-bit nonce, recommended for AES-GCM

const subtle = (): SubtleCrypto => {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("WebCrypto is unavailable in this environment");
  return c.subtle;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** UTF-8 encode into a fresh ArrayBuffer-backed view (satisfies `BufferSource`). */
function utf8(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(text));
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey("raw", utf8(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt the vault under a password. A fresh random salt and IV are generated
 * per call, so encrypting the same data twice yields different ciphertext. The
 * returned string is safe to persist at rest.
 */
export async function encryptVault(password: string, data: VaultData): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const plaintext = utf8(JSON.stringify(data));
  const ciphertext = await subtle().encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const vault: EncryptedVault = {
    version: 1,
    kdf: "PBKDF2",
    hash: "SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(vault);
}

/**
 * Decrypt a vault produced by {@link encryptVault}. Throws on a wrong password
 * (AES-GCM authentication fails) or a corrupt/unsupported payload.
 */
export async function decryptVault(password: string, serialized: string): Promise<VaultData> {
  let vault: EncryptedVault;
  try {
    vault = JSON.parse(serialized) as EncryptedVault;
  } catch {
    throw new Error("Vault is corrupt: not valid JSON");
  }
  if (vault.version !== 1 || vault.kdf !== "PBKDF2" || !vault.salt || !vault.iv) {
    throw new Error("Vault has an unsupported format");
  }

  const key = await deriveKey(password, fromBase64(vault.salt), vault.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64(vault.iv) },
      key,
      fromBase64(vault.ciphertext),
    );
  } catch {
    throw new Error("Incorrect password");
  }

  const data = JSON.parse(new TextDecoder().decode(plaintext)) as VaultData;
  if (data.version !== 1 || typeof data.mnemonic !== "string") {
    throw new Error("Vault is corrupt or has an unsupported format");
  }
  return data;
}
