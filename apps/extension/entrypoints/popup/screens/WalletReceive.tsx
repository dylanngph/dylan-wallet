import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  CheckIcon,
  CopyIcon,
  ShareIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../../../context/wallet-context";
import { useChains } from "../../../hooks/queries";
import { truncateAddress } from "../../../utils/format";
import { networkStyle } from "../../../utils/brand";

export function WalletReceive({
  onBack,
  onOpenAccounts,
}: {
  onBack: () => void;
  onOpenAccounts: () => void;
}) {
  const { state, selectedAccount } = useWallet();
  const { data: chains = [] } = useChains();
  const [copied, setCopied] = useState(false);

  const address = selectedAccount?.address ?? "";
  const network = chains.find((c) => c.id === state?.selectedChainId);
  const netStyle = networkStyle(state?.selectedChainId ?? 1);

  function copy() {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function share() {
    try {
      await navigator.share({ text: address });
    } catch {
      copy();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
        <button type="button" onClick={onBack} className="-ml-1.5 grid size-[30px] place-items-center">
          <ChevronLeftIcon className="size-[22px]" />
        </button>
        <span className="text-base font-bold">Receive</span>
      </div>

      <div className="dw-scroll flex flex-1 flex-col items-center overflow-y-auto px-[18px] pt-4 pb-3.5">
        <button
          type="button"
          onClick={onOpenAccounts}
          className="flex items-center gap-2 border border-border bg-secondary py-1.5 pr-[11px] pl-2"
        >
          <span
            className="size-[22px] flex-none rounded-full"
            style={{ background: "linear-gradient(135deg, var(--primary), #8B5CF6)" }}
          />
          <span className="text-sm font-semibold">{selectedAccount?.label ?? "Account"}</span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </button>

        <div className="relative mt-4 border border-border bg-white p-[13px]">
          {address && <QRCodeSVG value={address} size={150} level="H" marginSize={0} />}
          <span
            className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white text-base font-bold text-white"
            style={{ background: netStyle.color }}
          >
            {netStyle.glyph}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Scan to receive on {network?.name ?? "this network"}
        </div>

        <div className="mt-3.5 flex w-full items-center gap-2.5 border border-border bg-secondary px-3.5 py-[11px]">
          <div className="min-w-0 flex-1">
            <div className="mb-[3px] text-[11px] font-semibold text-muted-foreground">
              Wallet address
            </div>
            <div className="truncate font-mono text-[13px] text-[#16181D]">{address}</div>
          </div>
          <button
            type="button"
            onClick={copy}
            className="grid size-9 flex-none place-items-center border border-border bg-card text-primary"
          >
            {copied ? (
              <CheckIcon className="size-[17px] text-success" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
        </div>

        <div className="mt-2.5 flex w-full gap-2.5">
          <button
            type="button"
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-1.5 bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            type="button"
            onClick={share}
            className="grid w-12 flex-none place-items-center border border-border bg-card text-[#16181D]"
          >
            <ShareIcon className="size-[18px]" />
          </button>
        </div>

        <div className="mt-3 flex w-full gap-2.5 border border-warning-border bg-warning-muted px-3.5 py-[11px] text-left">
          <TriangleAlertIcon className="mt-0.5 size-[18px] flex-none text-warning" />
          <span className="text-xs leading-[1.45] text-warning-foreground">
            Only send {network?.name ?? "native"} and ERC-20 tokens to this address. Other assets may
            be lost.
          </span>
        </div>
      </div>
    </div>
  );
}
