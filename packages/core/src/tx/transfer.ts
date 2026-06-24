import {
  type Address,
  encodeFunctionData,
  erc20Abi,
  type Hex,
  parseUnits,
  type PublicClient,
  type WalletClient,
} from "viem";

/** What is being sent: the chain's native currency or an ERC-20 token. */
export type TransferAsset =
  | { kind: "native"; decimals: number }
  | { kind: "erc20"; token: Address; decimals: number };

export interface TransferRequest {
  asset: TransferAsset;
  recipient: Address;
  /** Human-readable amount (e.g. "1.5"), converted using the asset's decimals. */
  amount: string;
}

/** A ready-to-sign transaction: where to send, how much value, and calldata. */
export interface PreparedTransfer {
  to: Address;
  value: bigint;
  data: Hex;
}

/**
 * Turn a human transfer request into raw transaction fields. Native transfers
 * carry `value`; ERC-20 transfers carry zero value and an encoded `transfer()`
 * call to the token contract.
 */
export function prepareTransfer(request: TransferRequest): PreparedTransfer {
  const units = parseUnits(request.amount, request.asset.decimals);
  if (request.asset.kind === "native") {
    return { to: request.recipient, value: units, data: "0x" };
  }
  return {
    to: request.asset.token,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [request.recipient, units],
    }),
  };
}

export interface FeeEstimate {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  /** Upper-bound fee in wei: gas × maxFeePerGas. */
  total: bigint;
}

/** Estimate gas + EIP-1559 fees for a prepared transfer from a given sender. */
export async function estimateTransferFee(
  client: PublicClient,
  from: Address,
  prepared: PreparedTransfer,
): Promise<FeeEstimate> {
  const [gas, fees] = await Promise.all([
    client.estimateGas({
      account: from,
      to: prepared.to,
      value: prepared.value,
      data: prepared.data,
    }),
    client.estimateFeesPerGas(),
  ]);
  return {
    gas,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    total: gas * fees.maxFeePerGas,
  };
}

/** Sign and broadcast a prepared transfer. Returns the transaction hash. */
export async function executeTransfer(
  walletClient: WalletClient,
  prepared: PreparedTransfer,
): Promise<Hex> {
  return walletClient.sendTransaction({
    account: walletClient.account!,
    chain: walletClient.chain,
    to: prepared.to,
    value: prepared.value,
    data: prepared.data,
  });
}
