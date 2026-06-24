import type { Address } from "viem";

/** Static metadata for an ERC-20 token on a specific chain. */
export interface TokenInfo {
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

/** A token plus the owner's on-chain balance (base units). */
export interface TokenBalance extends TokenInfo {
  balance: bigint;
}

/** The chain's native currency balance (base units, i.e. wei). */
export interface NativeBalance {
  symbol: string;
  decimals: number;
  balance: bigint;
}
