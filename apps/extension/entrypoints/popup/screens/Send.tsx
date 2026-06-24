import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
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
import { StepTransition } from "@dylan-wallet/ui/components/step-transition";
import { FlowHeader } from "../../../components/FlowHeader";
import { DetailRow } from "../../../components/DetailRow";
import { useWallet } from "../../../context/wallet-context";
import type { BalancesResult, BalanceView, SendAsset } from "../../../lib/messaging";
import { useEstimateSend, useSend } from "../../../hooks/queries";
import { formatBalance, truncateAddress } from "../../../utils/format";

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
  const { selectedAccount } = useWallet();
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

  /** ERC-20: the full token balance. Native: balance minus the estimated gas fee. */
  async function setMax() {
    if (asset.kind === "erc20") {
      setAmount(formatBalance(asset.balance, asset.decimals, asset.decimals));
      return;
    }
    const probeTo = (isAddress(recipient) ? recipient : selectedAccount?.address) as
      | Address
      | undefined;
    if (!probeTo) {
      setAmount(formatBalance(asset.balance, asset.decimals));
      return;
    }
    try {
      const fee = await estimate.mutateAsync({ to: probeTo, amount: "0", asset: { kind: "native" } });
      const spendable = BigInt(asset.balance) - BigInt(fee.total);
      setAmount(formatBalance((spendable > 0n ? spendable : 0n).toString(), asset.decimals));
    } catch {
      setAmount(formatBalance(asset.balance, asset.decimals));
    }
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
      <FlowHeader steps={STEPS} current={step} onBack={() => (step === 0 ? onBack() : go(0))} />

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
                  onClick={setMax}
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
            <DetailRow label="Asset" value={asset.symbol} />
            <DetailRow label="Amount" value={`${amount} ${asset.symbol}`} />
            <DetailRow label="To" value={truncateAddress(recipient)} mono />
            <DetailRow
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
