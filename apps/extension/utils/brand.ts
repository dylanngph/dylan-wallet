/** Per-network brand color + glyph, matching the DylanWallet design. */
const NETWORK_STYLE: Record<number, { color: string; glyph: string }> = {
  1: { color: "#627EEA", glyph: "Ξ" },
  8453: { color: "#0052FF", glyph: "B" },
  42161: { color: "#28A0F0", glyph: "A" },
  10: { color: "#FF0420", glyph: "O" },
  137: { color: "#8247E5", glyph: "P" },
  11155111: { color: "#627EEA", glyph: "S" },
};

export function networkStyle(chainId: number): { color: string; glyph: string } {
  return NETWORK_STYLE[chainId] ?? { color: "#2F6BFF", glyph: "◆" };
}

const TOKEN_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  WETH: "#627EEA",
  USDC: "#2775CA",
  USDT: "#26A17B",
  WBTC: "#F7931A",
  DAI: "#F5AC37",
  LINK: "#2A5ADA",
  POL: "#8247E5",
  MATIC: "#8247E5",
};

const TOKEN_GLYPHS: Record<string, string> = {
  ETH: "Ξ",
  WETH: "Ξ",
  USDC: "$",
  USDT: "₮",
  WBTC: "₿",
  DAI: "◈",
};

export function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol.toUpperCase()] ?? "#2F6BFF";
}

export function tokenGlyph(symbol: string): string {
  return TOKEN_GLYPHS[symbol.toUpperCase()] ?? symbol.slice(0, 1).toUpperCase();
}
