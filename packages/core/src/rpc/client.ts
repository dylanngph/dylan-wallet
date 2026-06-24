import {
  type Account,
  type Chain,
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";

/**
 * Reliable, CORS-open public RPC endpoints for the built-in chains, used as the
 * preferred transport ahead of viem's bundled defaults. Custom chains fall back
 * to their configured RPC URL.
 */
const PREFERRED_RPC: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

/**
 * Build a resilient transport: an explicit override (if given), then the
 * preferred endpoint, then the chain's bundled default — viem's `fallback`
 * tries each in order until one succeeds.
 */
function transportFor(chain: Chain, override?: string): Transport {
  const urls = [override, PREFERRED_RPC[chain.id], chain.rpcUrls.default.http[0]].filter(
    (url): url is string => Boolean(url),
  );
  const unique = [...new Set(urls)];
  return fallback(unique.map((url) => http(url)));
}

/** A read-only viem client for a chain (balances, gas, calls). */
export function getPublicClient(chain: Chain, override?: string): PublicClient {
  return createPublicClient({ chain, transport: transportFor(chain, override) });
}

/** A signing client bound to a local account (used in the background to broadcast). */
export function getWalletClient(
  account: Account,
  chain: Chain,
  override?: string,
): WalletClient {
  return createWalletClient({ account, chain, transport: transportFor(chain, override) });
}
