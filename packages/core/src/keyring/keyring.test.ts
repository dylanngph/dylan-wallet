import { describe, expect, test } from "bun:test";
import { MemoryStore } from "../storage/memory.js";
import { Keyring } from "./keyring.js";

// Canonical Hardhat/Anvil mnemonic with publicly known derived addresses —
// proves our BIP-44 derivation (m/44'/60'/0'/0/i) matches the ecosystem.
const VECTOR_MNEMONIC =
  "test test test test test test test test test test test junk";
const VECTOR_ADDRESSES: `0x${string}`[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
];

const PASSWORD = "correct horse battery staple";

function newKeyring() {
  return new Keyring(new MemoryStore());
}

describe("Keyring", () => {
  test("imported mnemonic derives the canonical BIP-44 addresses", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    await kr.addAccount();
    await kr.addAccount();

    const accounts = await kr.getAccounts();
    expect(accounts.map((a) => a.address)).toEqual(VECTOR_ADDRESSES);
    expect(accounts.map((a) => a.index)).toEqual([0, 1, 2]);
  });

  test("rejects an invalid recovery phrase before persisting", async () => {
    const kr = newKeyring();
    await expect(
      kr.createVault({ password: PASSWORD, mnemonic: "not a valid mnemonic phrase" }),
    ).rejects.toThrow(/invalid recovery phrase/i);
    expect(await kr.isInitialized()).toBe(false);
  });

  test("a freshly generated vault is initialized, unlocked, and valid", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD });
    expect(await kr.isInitialized()).toBe(true);
    expect(kr.isUnlocked()).toBe(true);
    expect((await kr.getAccounts()).length).toBe(1);
  });

  test("lock wipes secrets; signing requires unlock", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    const [first] = await kr.getAccounts();

    kr.lock();
    expect(kr.isUnlocked()).toBe(false);
    await expect(kr.getSigner(first!.address)).rejects.toThrow(/locked/i);
    await expect(kr.addAccount()).rejects.toThrow(/locked/i);
    // public metadata still readable while locked
    expect((await kr.getAccounts())[0]!.address).toBe(VECTOR_ADDRESSES[0]!);
  });

  test("unlock with the right password restores signing; wrong password throws", async () => {
    const store = new MemoryStore();
    const kr = new Keyring(store);
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    kr.lock();

    await expect(kr.unlock("wrong password")).rejects.toThrow();
    expect(kr.isUnlocked()).toBe(false);

    await kr.unlock(PASSWORD);
    const signer = await kr.getSigner(VECTOR_ADDRESSES[0]! as `0x${string}`);
    expect(signer.address).toBe(VECTOR_ADDRESSES[0]!);
  });

  test("a derived signer produces a recoverable signature", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    const signer = await kr.getSigner(VECTOR_ADDRESSES[0]! as `0x${string}`);
    const signature = await signer.signMessage({ message: "gm" });
    expect(signature).toMatch(/^0x[0-9a-f]{130}$/i);
  });

  test("exportMnemonic re-authenticates and returns the seed", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    expect(await kr.exportMnemonic(PASSWORD)).toBe(VECTOR_MNEMONIC);
    await expect(kr.exportMnemonic("nope")).rejects.toThrow();
  });

  test("changePassword re-encrypts the vault", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    await kr.changePassword(PASSWORD, "new-password");
    kr.lock();
    await expect(kr.unlock(PASSWORD)).rejects.toThrow();
    await kr.unlock("new-password");
    expect(kr.isUnlocked()).toBe(true);
  });

  test("reset wipes the vault so the wallet is no longer initialized", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    expect(await kr.isInitialized()).toBe(true);

    await kr.reset();
    expect(await kr.isInitialized()).toBe(false);
    expect(kr.isUnlocked()).toBe(false);
    expect(await kr.getAccounts()).toEqual([]);
  });

  test("selected account defaults to first and follows selection", async () => {
    const kr = newKeyring();
    await kr.createVault({ password: PASSWORD, mnemonic: VECTOR_MNEMONIC });
    await kr.addAccount();
    expect((await kr.getSelectedAccount())?.index).toBe(0);
    await kr.selectAccount(1);
    expect((await kr.getSelectedAccount())?.address).toBe(VECTOR_ADDRESSES[1]!);
    await expect(kr.selectAccount(99)).rejects.toThrow(/does not exist/i);
  });
});
