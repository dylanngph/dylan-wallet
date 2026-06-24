import { defineUnlistedScript } from "#imports";
import {
  CONTENT_TARGET,
  INPAGE_TARGET,
  PROVIDER_NAME,
  PROVIDER_RDNS,
  PROVIDER_UUID,
  ProviderError,
} from "../lib/dapp-protocol";

/**
 * The inpage script: runs in the page's MAIN world and exposes an EIP-1193
 * provider as `window.ethereum`, announced via EIP-6963. It holds no secrets —
 * every `request` is forwarded to the content script (and then the background)
 * over `window.postMessage`.
 */
export default defineUnlistedScript(() => {
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};

  function emit(event: string, ...args: unknown[]) {
    listeners[event]?.forEach((fn) => {
      try {
        fn(...args);
      } catch {
        /* never let a dapp listener break the bridge */
      }
    });
  }

  const provider = {
    isDylanWallet: true,
    request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        window.postMessage({ target: CONTENT_TARGET, id, method, params }, "*");
      });
    },
    on(event: string, handler: (...args: unknown[]) => void) {
      (listeners[event] ??= new Set()).add(handler);
      return provider;
    },
    removeListener(event: string, handler: (...args: unknown[]) => void) {
      listeners[event]?.delete(handler);
      return provider;
    },
    // Legacy convenience used by older dapps.
    enable() {
      return provider.request({ method: "eth_requestAccounts" });
    },
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.target !== INPAGE_TARGET) return;

    if (typeof data.id === "number") {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      if (data.error) {
        entry.reject(new ProviderError(data.error.code, data.error.message));
      } else {
        entry.resolve(data.result);
      }
    } else if (data.event) {
      const ev = data.event;
      if (ev.type === "accountsChanged") emit("accountsChanged", ev.accounts);
      else if (ev.type === "chainChanged") emit("chainChanged", ev.chainId);
      else if (ev.type === "connect") emit("connect", { chainId: ev.chainId });
      else if (ev.type === "disconnect")
        emit("disconnect", new ProviderError(4900, "Wallet is disconnected"));
    }
  });

  try {
    Object.defineProperty(window, "ethereum", {
      value: provider,
      configurable: true,
      writable: true,
    });
  } catch {
    (window as unknown as { ethereum: unknown }).ethereum = provider;
  }

  // EIP-6963 — announce so dapps can discover us without window.ethereum conflicts.
  const icon =
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>" +
        "<rect width='32' height='32' fill='black'/>" +
        "<text x='16' y='22' font-size='18' fill='white' text-anchor='middle' " +
        "font-family='sans-serif'>D</text></svg>",
    );
  const info = Object.freeze({
    uuid: PROVIDER_UUID,
    name: PROVIDER_NAME,
    icon,
    rdns: PROVIDER_RDNS,
  });

  function announce() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info, provider }),
      }),
    );
  }
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
});
