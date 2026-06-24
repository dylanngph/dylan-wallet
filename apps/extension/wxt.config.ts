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
  },
});
