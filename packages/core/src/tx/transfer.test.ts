import { describe, expect, test } from "bun:test";
import { decodeFunctionData, erc20Abi, parseUnits } from "viem";
import { prepareTransfer } from "./transfer.js";

const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

describe("prepareTransfer", () => {
  test("native transfer carries value and empty calldata", () => {
    const prepared = prepareTransfer({
      asset: { kind: "native", decimals: 18 },
      recipient: RECIPIENT,
      amount: "1.5",
    });
    expect(prepared.to).toBe(RECIPIENT);
    expect(prepared.value).toBe(parseUnits("1.5", 18));
    expect(prepared.data).toBe("0x");
  });

  test("erc20 transfer encodes transfer() to the token with zero value", () => {
    const prepared = prepareTransfer({
      asset: { kind: "erc20", token: TOKEN, decimals: 6 },
      recipient: RECIPIENT,
      amount: "25",
    });
    expect(prepared.to).toBe(TOKEN);
    expect(prepared.value).toBe(0n);

    const decoded = decodeFunctionData({ abi: erc20Abi, data: prepared.data });
    expect(decoded.functionName).toBe("transfer");
    expect(decoded.args).toEqual([RECIPIENT, parseUnits("25", 6)]);
  });

  test("respects token decimals when converting the amount", () => {
    const prepared = prepareTransfer({
      asset: { kind: "erc20", token: TOKEN, decimals: 6 },
      recipient: RECIPIENT,
      amount: "1",
    });
    const decoded = decodeFunctionData({ abi: erc20Abi, data: prepared.data });
    expect(decoded.args?.[1]).toBe(1_000_000n);
  });
});
