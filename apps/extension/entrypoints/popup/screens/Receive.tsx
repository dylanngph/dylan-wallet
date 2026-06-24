import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";

export function Receive({ address, onBack }: { address: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onBack}>
        <ArrowLeftIcon /> Back
      </Button>
      <h2 className="text-base font-semibold">Receive</h2>
      <p className="text-sm text-muted-foreground">
        Share this address to receive assets on the selected network.
      </p>
      <div className="border bg-muted/40 p-4">
        <p className="font-mono text-sm break-all">{address}</p>
      </div>
      <Button variant="outline" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy address"}
      </Button>
    </div>
  );
}
