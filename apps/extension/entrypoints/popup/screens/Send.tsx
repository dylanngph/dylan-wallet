import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, CopyIcon } from "lucide-react";
import { isAddress } from "@dylan-wallet/core";
import type { Address } from "viem";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { Label } from "@dylan-wallet/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dylan-wallet/ui/components/select";
import { Stepper } from "@dylan-wallet/ui/components/stepper";
import { StepTransition } from "@dylan-wallet/ui/components/step-transition";
import type { BalancesResult, BalanceView, SendAsset } from "../../../lib/messaging";
import { useEstimateSend, useSend } from "../../../lib/queries";
import { formatBalance, truncateAddress } from "../../../lib/format";

const STEPS = ["Details", "Review"];
const AMOUNT_RE = /^\d*\.?\d+$/;

export function Send({
  balances,
  onBack,
  onDone,
}: {
  balances: BalancesResult;
  onBack: () => void;
  onDone: () => void;
}) {
  const assets = [balances.native, ...balances.tokens];
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [assetKey, setAssetKey] = useState("native");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const estimate = useEstimateSend();
  const send = useSend();

  const asset: BalanceView =
    assets.find((a) => (a.kind === "native" ? "native" : a.address) === assetKey) ??
    balances.native;

  const sendAsset: SendAsset =
    asset.kind === "native"
      ? { kind: "native" }
      : { kind: "erc20", token: asset.address as Address, decimals: asset.decimals };

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function toReview() {
    if (!isAddress(recipient)) return setError("Enter a valid recipient address");
    if (!AMOUNT_RE.test(amount) || Number(amount) <= 0) return setError("Enter a valid amount");
    setError(null);
    try {
      await estimate.mutateAsync({ to: recipient as Address, amount, asset: sendAsset });
      go(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to estimate fee");
    }
  }

  function confirm() {
    send.mutate({ to: recipient as Address, amount, asset: sendAsset });
  }

  if (send.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center bg-primary text-primary-foreground">
          <CheckIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Transaction sent</h2>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigator.clipboard.writeText(send.data.hash)}
          >
            <span className="font-mono">{truncateAddress(send.data.hash)}</span>
            <CopyIcon className="size-3.5" />
          </button>
        </div>
        <Button className="mt-2 w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => (step === 0 ? onBack() : go(0))}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <Stepper steps={STEPS} current={step} />
      </div>

      <StepTransition stepKey={step} direction={direction}>
        {step === 0 ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Asset</Label>
              <Select value={assetKey} onValueChange={setAssetKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => {
                    const key = a.kind === "native" ? "native" : (a.address as string);
                    return (
                      <SelectItem key={key} value={key}>
                        {a.symbol} · {formatBalance(a.balance, a.decimals)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAmount(formatBalance(asset.balance, asset.decimals, 18))}
                >
                  Max: {formatBalance(asset.balance, asset.decimals)} {asset.symbol}
                </button>
              </div>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="mt-auto" onClick={toReview} disabled={estimate.isPending}>
              {estimate.isPending ? "Estimating..." : "Review"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <Row label="Asset" value={asset.symbol} />
            <Row label="Amount" value={`${amount} ${asset.symbol}`} />
            <Row label="To" value={truncateAddress(recipient)} mono />
            <Row
              label="Network fee"
              value={
                estimate.data
                  ? `~${formatBalance(estimate.data.total, balances.native.decimals)} ${balances.native.symbol}`
                  : "—"
              }
            />
            {send.isError && (
              <p className="text-sm text-destructive">
                {send.error.message || "Transaction failed"}
              </p>
            )}
            <Button className="mt-auto" onClick={confirm} disabled={send.isPending}>
              {send.isPending ? "Sending..." : "Confirm & send"}
            </Button>
          </div>
        )}
      </StepTransition>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  );
}
