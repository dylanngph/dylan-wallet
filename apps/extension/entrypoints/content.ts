import { defineContentScript, injectScript, browser } from "#imports";
import {
  CONTENT_TARGET,
  INPAGE_TARGET,
  type DappEventMessage,
} from "../lib/dapp-protocol";

/**
 * The content script runs in the ISOLATED world at document_start. It injects
 * the inpage provider into the page's MAIN world, then bridges messages:
 *   inpage (postMessage) → background (runtime) → inpage (postMessage)
 * and forwards provider events pushed from the background to the page.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  async main() {
    await injectScript("/inpage.js", { keepInDom: true });

    // Page → background: forward JSON-RPC requests and relay the reply back.
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.target !== CONTENT_TARGET || typeof data.id !== "number") return;

      try {
        const response = (await browser.runtime.sendMessage({
          kind: "dapp",
          method: data.method,
          params: data.params,
        })) as { result?: unknown; error?: { code: number; message: string } };

        window.postMessage(
          response?.error
            ? { target: INPAGE_TARGET, id: data.id, error: response.error }
            : { target: INPAGE_TARGET, id: data.id, result: response?.result },
          "*",
        );
      } catch (err) {
        window.postMessage(
          {
            target: INPAGE_TARGET,
            id: data.id,
            error: { code: 4900, message: err instanceof Error ? err.message : String(err) },
          },
          "*",
        );
      }
    });

    // Background → page: forward provider events (accountsChanged, chainChanged…).
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as DappEventMessage;
      if (msg?.kind === "dapp-event") {
        window.postMessage({ target: INPAGE_TARGET, event: msg.event }, "*");
      }
    });
  },
});
