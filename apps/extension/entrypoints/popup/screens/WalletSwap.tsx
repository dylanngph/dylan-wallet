import { useState } from "react";
import { ArrowDownUpIcon, ChevronDownIcon, ChevronLeftIcon, SlidersHorizontalIcon } from "lucide-react";

/**
 * Swap UI — visual only for now. Wiring (quotes, routing, approval, execution)
 * is a later feature; inputs are local and "Review swap" is a no-op.
 */
export function WalletSwap({ onBack }: { onBack: () => void }) {
  const [pay, setPay] = useState("1");
  const receive = (Number(pay) || 0) * 2398;
  const usd = (Number(pay) || 0) * 2398;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
        <button type="button" onClick={onBack} className="-ml-1.5 grid size-[30px] place-items-center">
          <ChevronLeftIcon className="size-[22px]" />
        </button>
        <span className="flex-1 text-base font-bold">Swap</span>
        <button type="button" className="grid size-[30px] place-items-center text-[#6B7280]">
          <SlidersHorizontalIcon className="size-[19px]" />
        </button>
      </div>

      <div className="dw-scroll flex-1 overflow-y-auto p-4">
        <div className="relative">
          <div className="border border-border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">You pay</span>
              <span className="font-mono text-[11px] text-muted-foreground">Balance: 3.842</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <input
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent font-mono text-[26px] font-bold outline-none"
              />
              <TokenPill glyph="Ξ" color="#627EEA" symbol="ETH" />
            </div>
            <div className="mt-2 font-mono text-xs text-muted-foreground">
              ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="relative z-[2] -my-[18px] grid size-9 place-items-center border border-border bg-card text-primary"
            >
              <ArrowDownUpIcon className="size-[18px]" />
            </button>
          </div>

          <div className="border border-border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">You receive</span>
              <span className="font-mono text-[11px] text-muted-foreground">Balance: 2,140.00</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="min-w-0 flex-1 truncate font-mono text-[26px] font-bold">
                {receive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <TokenPill glyph="$" color="#2775CA" symbol="USDC" />
            </div>
            <div className="mt-2 font-mono text-xs text-muted-foreground">
              ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="mt-4 border border-hairline">
          <DetailLine label="Rate" value="1 ETH = 2,398 USDC" />
          <DetailLine label="Price impact" value="0.04%" valueClass="text-success" />
          <DetailLine label="Network fee" value="~$1.42" last />
        </div>
      </div>

      <div className="border-t border-hairline p-4">
        <button
          type="button"
          className="w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground"
        >
          Review swap
        </button>
      </div>
    </div>
  );
}

function TokenPill({ glyph, color, symbol }: { glyph: string; color: string; symbol: string }) {
  return (
    <div className="flex items-center gap-[7px] border border-border bg-secondary px-2.5 py-1.5">
      <span
        className="grid size-[22px] place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: color }}
      >
        {glyph}
      </span>
      <span className="text-sm font-bold text-[#16181D]">{symbol}</span>
      <ChevronDownIcon className="size-3 text-muted-foreground" />
    </div>
  );
}

function DetailLine({
  label,
  value,
  valueClass,
  last,
}: {
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex justify-between px-3.5 py-[11px] ${last ? "" : "border-b border-[#F4F5F7]"}`}>
      <span className="text-xs text-[#6B7280]">{label}</span>
      <span className={`font-mono text-xs ${valueClass ?? "text-[#16181D]"}`}>{value}</span>
    </div>
  );
}
