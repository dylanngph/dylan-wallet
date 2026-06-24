import { describe, expect, test } from "bun:test";
import { decryptVault, encryptVault, type VaultData } from "./vault.js";

const DATA: VaultData = {
  version: 1,
  mnemonic: "test test test test test test test test test test test junk",
};

describe("vault", () => {
  test("round-trips with the correct password", async () => {
    const ciphertext = await encryptVault("hunter2", DATA);
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext).not.toContain(DATA.mnemonic);
    expect(await decryptVault("hunter2", ciphertext)).toEqual(DATA);
  });

  test("fails to decrypt with the wrong password", async () => {
    const ciphertext = await encryptVault("hunter2", DATA);
    await expect(decryptVault("wrong", ciphertext)).rejects.toThrow();
  });

  test("encryption is salted (distinct ciphertexts for same input)", async () => {
    const a = await encryptVault("pw", DATA);
    const b = await encryptVault("pw", DATA);
    expect(a).not.toBe(b);
  });
});
