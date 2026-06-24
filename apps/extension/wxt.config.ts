import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Dylan Wallet",
    description: "A non-custodial EVM wallet.",
    // `storage` for the encrypted vault + account metadata.
    permissions: ["storage"],
    // Needed so the background service worker can call arbitrary EVM RPC
    // endpoints and inject the provider into dapp pages without being blocked
    // by CORS. A wallet inherently talks to user-configurable hosts.
    host_permissions: ["<all_urls>"],
    // The inpage EIP-1193 provider, injected by the content script into pages.
    web_accessible_resources: [{ resources: ["inpage.js"], matches: ["<all_urls>"] }],
  },
});
