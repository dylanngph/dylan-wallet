import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, CopyIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
        Scan the code or share your address to receive assets on the selected network.
      </p>
      <div className="flex justify-center">
        <div className="border bg-white p-3">
          <QRCodeSVG value={address} size={176} marginSize={0} />
        </div>
      </div>
      <div className="border bg-muted/40 p-3">
        <p className="font-mono text-sm break-all">{address}</p>
      </div>
      <Button variant="outline" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy address"}
      </Button>
    </div>
  );
}
