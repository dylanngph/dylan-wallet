import { browser } from "#imports";
import { hexToString, toHex, type Address, type Hex } from "viem";
import type { WalletService } from "./wallet-service";
import type { ApprovalService } from "./approval-service";
import {
  type DappTx,
  type ProviderEvent,
  ProviderError,
  ProviderErrors,
} from "../lib/dapp-protocol";

const CONNECTIONS_KEY = "dapp.connections";

const userRejected = () =>
  new ProviderError(ProviderErrors.userRejected.code, ProviderErrors.userRejected.message);

function safeOrigin(url?: string): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

/**
 * Implements the EIP-1193 surface dapps call through the injected provider:
 * connection management, signing, transactions (each gated by an approval
 * window), passthrough reads, and provider events to connected pages.
 */
export class DappService {
  constructor(
    private wallet: WalletService,
    private approvals: ApprovalService,
  ) {}

  #connections = async () =>
    (await this.wallet.store.get<string[]>(CONNECTIONS_KEY)) ?? [];

  async isConnected(origin: string): Promise<boolean> {
    return (await this.#connections()).includes(origin);
  }

  async #connect(origin: string) {
    const current = await this.#connections();
    if (!current.includes(origin)) {
      await this.wallet.store.set(CONNECTIONS_KEY, [...current, origin]);
    }
  }

  async #requireConnected(origin: string) {
    if (!(await this.isConnected(origin))) {
      throw new ProviderError(ProviderErrors.unauthorized.code, ProviderErrors.unauthorized.message);
    }
  }

  async broadcast(event: ProviderEvent) {
    const connected = new Set(await this.#connections());
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined || !connected.has(safeOrigin(tab.url))) continue;
      void browser.tabs.sendMessage(tab.id, { kind: "dapp-event", event }).catch(() => {});
    }
  }

  async emitAccountsChanged() {
    const address = this.wallet.isUnlocked()
      ? (await this.wallet.keyring.getSelectedAccount())?.address
      : undefined;
    await this.broadcast({ type: "accountsChanged", accounts: address ? [address] : [] });
  }

  async emitChainChanged() {
    await this.broadcast({ type: "chainChanged", chainId: toHex(await this.wallet.selectedChainId()) });
  }

  toRpcError(error: unknown): { code: number; message: string } {
    return error instanceof ProviderError
      ? { code: error.code, message: error.message }
      : { code: -32603, message: error instanceof Error ? error.message : String(error) };
  }

  async handle(origin: string, method: string, params: unknown[] = []): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts": {
        if (!(await this.wallet.isInitialized())) {
          throw new ProviderError(ProviderErrors.unauthorized.code, "Wallet is not set up yet");
        }
        if ((await this.isConnected(origin)) && this.wallet.isUnlocked()) {
          return [await this.wallet.selectedAddress()];
        }
        if (!(await this.approvals.request({ type: "connect", origin }))) throw userRejected();
        await this.#connect(origin);
        await this.emitAccountsChanged();
        await this.broadcast({ type: "connect", chainId: toHex(await this.wallet.selectedChainId()) });
        return [await this.wallet.selectedAddress()];
      }
      case "eth_accounts":
        return (await this.isConnected(origin)) && this.wallet.isUnlocked()
          ? [await this.wallet.selectedAddress()]
          : [];
      case "eth_chainId":
        return toHex(await this.wallet.selectedChainId());
      case "net_version":
        return String(await this.wallet.selectedChainId());

      case "wallet_switchEthereumChain": {
        const target = Number((params[0] as { chainId: string }).chainId);
        if (!(await this.wallet.chains.getById(target))) {
          throw new ProviderError(
            ProviderErrors.chainNotAdded.code,
            ProviderErrors.chainNotAdded.message,
          );
        }
        await this.wallet.selectChain(target);
        await this.emitChainChanged();
        return null;
      }

      case "wallet_addEthereumChain": {
        const p = params[0] as {
          chainId: string;
          chainName: string;
          rpcUrls: string[];
          nativeCurrency: { name: string; symbol: string; decimals: number };
          blockExplorerUrls?: string[];
        };
        const id = Number(p.chainId);
        if (await this.wallet.chains.getById(id)) {
          await this.wallet.selectChain(id);
          await this.emitChainChanged();
          return null;
        }
        const rpcUrl = p.rpcUrls?.[0];
        if (!rpcUrl) throw new ProviderError(-32602, "Missing rpcUrls");
        const approved = await this.approvals.request({
          type: "addChain",
          origin,
          chain: { id, name: p.chainName, rpcUrl, symbol: p.nativeCurrency.symbol },
        });
        if (!approved) throw userRejected();
        await this.wallet.addCustomChain({
          id,
          name: p.chainName,
          rpcUrl,
          nativeCurrency: p.nativeCurrency,
          blockExplorerUrl: p.blockExplorerUrls?.[0],
        });
        await this.wallet.selectChain(id);
        await this.emitChainChanged();
        return null;
      }

      case "personal_sign": {
        await this.#requireConnected(origin);
        const [messageHex, address] = params as [Hex, Address];
        let message: string = messageHex;
        try {
          message = hexToString(messageHex);
        } catch {
          /* keep raw hex if it isn't UTF-8 text */
        }
        if (!(await this.approvals.request({ type: "signMessage", origin, address, message }))) {
          throw userRejected();
        }
        const signer = await this.wallet.getSigner(address);
        return signer.signMessage({ message: { raw: messageHex } });
      }

      case "eth_signTypedData_v4": {
        await this.#requireConnected(origin);
        const [address, json] = params as [Address, string];
        if (!(await this.approvals.request({ type: "signTypedData", origin, address, typedData: json }))) {
          throw userRejected();
        }
        const signer = await this.wallet.getSigner(address);
        return signer.signTypedData(JSON.parse(json));
      }

      case "eth_sendTransaction": {
        await this.#requireConnected(origin);
        const tx = (params[0] ?? {}) as DappTx;
        if (!(await this.approvals.request({ type: "sendTransaction", origin, tx }))) {
          throw userRejected();
        }
        const chain = await this.wallet.activeChain();
        const from = tx.from ?? (await this.wallet.selectedAddress());
        const signer = await this.wallet.getSigner(from);
        return this.wallet.walletClient(signer, chain).sendTransaction({
          account: signer,
          chain,
          to: tx.to,
          value: tx.value ? BigInt(tx.value) : undefined,
          data: tx.data as Hex | undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
        });
      }

      case "eth_sign":
        throw new ProviderError(ProviderErrors.unsupported.code, "eth_sign is not supported");

      default: {
        const client = this.wallet.publicClient(await this.wallet.activeChain());
        return client.request({ method, params } as never);
      }
    }
  }
}
