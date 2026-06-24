import { useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ClipboardIcon, CheckIcon, CopyIcon } from "lucide-react";
import { isAddress } from "@dylan-wallet/core";
import type { Address } from "viem";
import { BottomSheet } from "../../../components/BottomSheet";
import { useWallet } from "../../../context/wallet-context";
import { useBalances, useEstimateSend, useSend } from "../../../hooks/queries";
import type { BalanceView, SendAsset } from "../../../lib/messaging";
import { formatBalance, truncateAddress } from "../../../utils/format";
import { tokenColor, tokenGlyph } from "../../../utils/brand";

const AMOUNT_RE = /^\d*\.?\d+$/;

export function WalletSend({ onBack }: { onBack: () => void }) {
  const { state, selectedAccount } = useWallet();
  const balances = useBalances(state);
  const estimate = useEstimateSend();
  const send = useSend();

  const assets: BalanceView[] = balances.data ? [balances.data.native, ...balances.data.tokens] : [];
  const [assetKey, setAssetKey] = useState("native");
  const [assetSheet, setAssetSheet] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [error, setError] = useState<string | null>(null);

  const asset =
    assets.find((a) => (a.kind === "native" ? "native" : a.address) === assetKey) ??
    balances.data?.native;
  const native = balances.data?.native;

  const sendAsset: SendAsset =
    asset?.kind === "erc20"
      ? { kind: "erc20", token: asset.address as Address, decimals: asset.decimals }
      : { kind: "native" };

  async function paste() {
    try {
      setRecipient((await navigator.clipboard.readText()).trim());
    } catch {
      /* clipboard unavailable */
    }
  }

  async function setMax() {
    if (!asset) return;
    if (asset.kind === "erc20") return setAmount(formatBalance(asset.balance, asset.decimals, asset.decimals));
    const probeTo = (isAddress(recipient) ? recipient : selectedAccount?.address) as Address | undefined;
    if (!probeTo) return setAmount(formatBalance(asset.balance, asset.decimals));
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
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to estimate fee");
    }
  }

  if (send.data) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Sent" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-success text-white">
            <CheckIcon className="size-6" />
          </div>
          <div className="text-base font-bold">Transaction sent</div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(send.data.hash)}
            className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground"
          >
            {truncateAddress(send.data.hash)} <CopyIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === "review" && asset) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Review" onBack={() => setStep("form")} />
        <div className="dw-scroll flex-1 overflow-y-auto p-4">
          <ReviewRow label="Asset" value={asset.symbol} />
          <ReviewRow label="Amount" value={`${amount} ${asset.symbol}`} />
          <ReviewRow label="To" value={truncateAddress(recipient)} mono />
          <ReviewRow
            label="Network fee"
            value={
              estimate.data && native
                ? `~${formatBalance(estimate.data.total, native.decimals)} ${native.symbol}`
                : "—"
            }
          />
          {send.isError && (
            <p className="mt-3 text-sm text-destructive">{send.error.message || "Transaction failed"}</p>
          )}
        </div>
        <div className="border-t border-hairline p-4">
          <button
            type="button"
            onClick={() => send.mutate({ to: recipient as Address, amount, asset: sendAsset })}
            disabled={send.isPending}
            className="w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-60"
          >
            {send.isPending ? "Sending..." : "Confirm & send"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Send" onBack={onBack} />
      <div className="dw-scroll flex-1 overflow-y-auto p-4">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Asset</div>
        <button
          type="button"
          onClick={() => setAssetSheet(true)}
          className="flex w-full items-center gap-3 border border-border bg-secondary px-3.5 py-3"
        >
          {asset && (
            <>
              <span
                className="grid size-[34px] flex-none place-items-center rounded-full text-[15px] font-bold text-white"
                style={{ background: tokenColor(asset.symbol) }}
              >
                {tokenGlyph(asset.symbol)}
              </span>
              <div className="flex-1 text-left">
                <div className="text-[15px] font-semibold">{asset.name}</div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Balance: {formatBalance(asset.balance, asset.decimals)} {asset.symbol}
                </div>
              </div>
            </>
          )}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </button>

        <div className="mt-[18px] mb-2 text-xs font-semibold text-muted-foreground">Amount</div>
        <div className="border border-border p-3.5">
          <div className="flex items-center gap-2.5">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-mono text-[30px] font-bold outline-none"
            />
            <span className="text-base font-bold text-[#6B7280]">{asset?.symbol}</span>
            <button
              type="button"
              onClick={setMax}
              className="border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary"
            >
              Max
            </button>
          </div>
        </div>

        <div className="mt-[18px] mb-2 text-xs font-semibold text-muted-foreground">To</div>
        <div className="flex items-center gap-2.5 border border-border px-3.5 py-3">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Address or ENS name"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none"
          />
          <button type="button" onClick={paste} className="text-xs font-bold text-primary">
            Paste
          </button>
          <ClipboardIcon className="size-[18px] text-[#6B7280]" />
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>

      <div className="border-t border-hairline p-4">
        <button
          type="button"
          onClick={toReview}
          disabled={estimate.isPending}
          className="w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {estimate.isPending ? "Estimating..." : "Continue"}
        </button>
      </div>

      <BottomSheet open={assetSheet} onClose={() => setAssetSheet(false)} title="Select asset">
        {assets.map((a) => {
          const key = a.kind === "native" ? "native" : (a.address as string);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAssetKey(key);
                setAssetSheet(false);
              }}
              className="flex w-full items-center gap-3 border-b border-hairline bg-card px-4 py-[13px] text-left"
            >
              <span
                className="grid size-[34px] flex-none place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: tokenColor(a.symbol) }}
              >
                {tokenGlyph(a.symbol)}
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{a.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {formatBalance(a.balance, a.decimals)} {a.symbol}
                </div>
              </div>
            </button>
          );
        })}
      </BottomSheet>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
      <button type="button" onClick={onBack} className="-ml-1.5 grid size-[30px] place-items-center">
        <ChevronLeftIcon className="size-[22px]" />
      </button>
      <span className="text-base font-bold">{title}</span>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3 text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className={mono ? "font-mono text-[13px]" : "font-semibold"}>{value}</span>
    </div>
  );
}
