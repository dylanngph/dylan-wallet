import { describe, expect, test } from "bun:test";
import { MemoryStore } from "../storage/memory.js";
import { BUILTIN_CHAINS, ChainRegistry, type CustomChainInput } from "./registry.js";

const CUSTOM: CustomChainInput = {
  id: 1337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrl: "http://127.0.0.1:8545",
  blockExplorerUrl: "http://localhost:4000",
  testnet: true,
};

describe("ChainRegistry", () => {
  test("lists built-in chains by default", async () => {
    const reg = new ChainRegistry(new MemoryStore());
    const ids = (await reg.list()).map((c) => c.id);
    expect(ids).toEqual([...BUILTIN_CHAINS].map((c) => c.id));
    expect(await reg.getById(1)).toBeDefined();
  });

  test("adds, resolves, and persists a custom chain", async () => {
    const store = new MemoryStore();
    const reg = new ChainRegistry(store);
    await reg.addCustom(CUSTOM);

    const chain = await reg.getById(1337);
    expect(chain?.name).toBe("Localhost");
    expect(chain?.rpcUrls.default.http[0]).toBe(CUSTOM.rpcUrl);

    // a fresh registry over the same store sees the persisted chain
    const reloaded = new ChainRegistry(store);
    expect(await reloaded.getById(1337)).toBeDefined();
  });

  test("removes a custom chain", async () => {
    const reg = new ChainRegistry(new MemoryStore());
    await reg.addCustom(CUSTOM);
    await reg.removeCustom(1337);
    expect(await reg.getById(1337)).toBeUndefined();
  });

  test("a custom chain overrides a built-in with the same id", async () => {
    const reg = new ChainRegistry(new MemoryStore());
    await reg.addCustom({ ...CUSTOM, id: 1, name: "My Mainnet RPC" });
    const all = await reg.list();
    const mainnets = all.filter((c) => c.id === 1);
    expect(mainnets).toHaveLength(1);
    expect(mainnets[0]!.name).toBe("My Mainnet RPC");
  });
});
