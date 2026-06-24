import type { Address } from "viem";

/** postMessage targets for the inpage <-> content bridge. */
export const INPAGE_TARGET = "dylan:inpage";
export const CONTENT_TARGET = "dylan:content";

/** EIP-6963 provider identity (static parts; icon is built at runtime). */
export const PROVIDER_UUID = "b1d9a1e2-0c3a-4b2a-9f1a-1234567890ab";
export const PROVIDER_NAME = "Dylan Wallet";
export const PROVIDER_RDNS = "io.dylan.wallet";

/** EIP-1193 provider events pushed from the wallet to the dapp. */
export type ProviderEvent =
  | { type: "accountsChanged"; accounts: Address[] }
  | { type: "chainChanged"; chainId: string }
  | { type: "connect"; chainId: string }
  | { type: "disconnect" };

/** inpage → content: a JSON-RPC request. */
export interface RpcRequestMessage {
  target: typeof CONTENT_TARGET;
  id: number;
  method: string;
  params?: unknown[];
}

/** content → inpage: a response or a pushed event. */
export interface RpcResponseMessage {
  target: typeof INPAGE_TARGET;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}
export interface EventBridgeMessage {
  target: typeof INPAGE_TARGET;
  event: ProviderEvent;
}

/** content → background: a dapp RPC request (distinct from wallet-UI messages). */
export interface DappRequest {
  kind: "dapp";
  method: string;
  params?: unknown[];
}

/** background → content: a provider event to forward to the page. */
export interface DappEventMessage {
  kind: "dapp-event";
  event: ProviderEvent;
}

/** Minimal transaction shape a dapp sends via `eth_sendTransaction`. */
export interface DappTx {
  from?: Address;
  to?: Address;
  value?: string;
  data?: string;
  gas?: string;
}

/** A chain a dapp asks to add via `wallet_addEthereumChain`. */
export interface AddChainRequest {
  id: number;
  name: string;
  rpcUrl: string;
  symbol: string;
}

/** What an approval window is asked to authorize. */
export type ApprovalPayload =
  | { type: "connect"; origin: string }
  | { type: "signMessage"; origin: string; address: Address; message: string }
  | { type: "signTypedData"; origin: string; address: Address; typedData: string }
  | { type: "sendTransaction"; origin: string; tx: DappTx }
  | { type: "addChain"; origin: string; chain: AddChainRequest };

/** EIP-1193 / EIP-1474 error codes. */
export const ProviderErrors = {
  userRejected: { code: 4001, message: "User rejected the request" },
  unauthorized: { code: 4100, message: "Unauthorized — connect the wallet first" },
  unsupported: { code: 4200, message: "Unsupported method" },
  disconnected: { code: 4900, message: "Wallet is disconnected" },
  chainNotAdded: { code: 4902, message: "Unrecognized chain ID" },
} as const;

export class ProviderError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}
