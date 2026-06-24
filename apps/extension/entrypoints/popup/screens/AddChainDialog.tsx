import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dylan-wallet/ui/components/dialog";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { Label } from "@dylan-wallet/ui/components/label";
import { useAddCustomChain } from "../../../hooks/queries";

export function AddChainDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [chainId, setChainId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [symbol, setSymbol] = useState("");
  const [explorer, setExplorer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addChain = useAddCustomChain();

  async function submit() {
    const id = Number(chainId);
    if (!name || !id || !rpcUrl || !symbol) {
      return setError("Name, chain ID, RPC URL and symbol are required");
    }
    setError(null);
    try {
      await addChain.mutateAsync({
        id,
        name,
        rpcUrl,
        nativeCurrency: { name: symbol, symbol, decimals: 18 },
        blockExplorerUrl: explorer || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const fields = [
    { id: "name", label: "Network name", value: name, set: setName, placeholder: "My Network" },
    { id: "chainId", label: "Chain ID", value: chainId, set: setChainId, placeholder: "1" },
    { id: "rpcUrl", label: "RPC URL", value: rpcUrl, set: setRpcUrl, placeholder: "https://..." },
    { id: "symbol", label: "Currency symbol", value: symbol, set: setSymbol, placeholder: "ETH" },
    { id: "explorer", label: "Block explorer (optional)", value: explorer, set: setExplorer, placeholder: "https://..." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[320px]">
        <DialogHeader>
          <DialogTitle>Add custom network</DialogTitle>
          <DialogDescription>Add any EVM-compatible chain by its RPC details.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id}>{f.label}</Label>
              <Input
                id={f.id}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                inputMode={f.id === "chainId" ? "numeric" : undefined}
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={addChain.isPending} className="w-full">
            Add network
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
