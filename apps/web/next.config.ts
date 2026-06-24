import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages consumed as TypeScript source.
  transpilePackages: ["@dylan-wallet/ui", "@dylan-wallet/core"],
};

export default nextConfig;
