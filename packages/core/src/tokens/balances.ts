import { type Address, erc20Abi, type PublicClient } from "viem";
import type { Chain } from "viem";
import type { NativeBalance, TokenBalance } from "./types.js";

/** Fetch the native-currency balance for an address. */
export async function getNativeBalance(
  client: PublicClient,
  address: Address,
): Promise<NativeBalance> {
  const chain = client.chain as Chain;
  const balance = await client.getBalance({ address });
  return {
    symbol: chain.nativeCurrency.symbol,
    decimals: chain.nativeCurrency.decimals,
    balance,
  };
}

/**
 * Fetch ERC-20 balances + metadata for many tokens in a single multicall.
 * Tokens whose calls fail (e.g. a bad address, or no multicall support) are
 * skipped rather than throwing, so one bad token can't break the list.
 */
export async function getErc20Balances(
  client: PublicClient,
  owner: Address,
  tokenAddresses: Address[],
): Promise<TokenBalance[]> {
  if (tokenAddresses.length === 0) return [];
  const chainId = (client.chain as Chain).id;

  const contracts = tokenAddresses.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "balanceOf", args: [owner] } as const,
    { address, abi: erc20Abi, functionName: "symbol" } as const,
    { address, abi: erc20Abi, functionName: "name" } as const,
    { address, abi: erc20Abi, functionName: "decimals" } as const,
  ]);

  const results = await client.multicall({ contracts, allowFailure: true });

  const balances: TokenBalance[] = [];
  tokenAddresses.forEach((address, i) => {
    const [balance, symbol, name, decimals] = results.slice(i * 4, i * 4 + 4);
    if (
      balance?.status !== "success" ||
      symbol?.status !== "success" ||
      decimals?.status !== "success"
    ) {
      return;
    }
    balances.push({
      chainId,
      address,
      symbol: symbol.result as string,
      name: (name?.status === "success" ? (name.result as string) : (symbol.result as string)),
      decimals: decimals.result as number,
      balance: balance.result as bigint,
    });
  });
  return balances;
}
