import { formatUnits } from "@dylan-wallet/core";

/** `0x1234…cdef` */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Format a base-unit balance string for display, trimming trailing zeros. */
export function formatBalance(raw: string, decimals: number, maxFractionDigits = 6): string {
  const full = formatUnits(BigInt(raw), decimals);
  const [whole, fraction = ""] = full.split(".");
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole!;
}
