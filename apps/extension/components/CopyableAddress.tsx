import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { truncateAddress } from "../utils/format";

/** A truncated address that copies to the clipboard when clicked. */
export function CopyableAddress({ address, className }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground ${className ?? ""}`}
      onClick={() => {
        void navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      <span className="font-mono">{truncateAddress(address)}</span>
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}
