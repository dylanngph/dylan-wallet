import { useState, type ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowDownUpIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LockIcon,
  PlusIcon,
} from "lucide-react";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dylan-wallet/ui/components/dropdown-menu";
import { useWallet } from "../../../context/wallet-context";
import { useBalances, useChains, useLock } from "../../../hooks/queries";
import { formatBalance, truncateAddress } from "../../../utils/format";
import { networkStyle, tokenColor, tokenGlyph } from "../../../utils/brand";
import { RevealPhraseDialog } from "./RevealPhraseDialog";

const TABS = ["Tokens", "NFTs", "Activity"] as const;

export function WalletHome({
  onSend,
  onSwap,
  onReceive,
  onOpenNetwork,
  onOpenAccounts,
}: {
  onSend: () => void;
  onSwap: () => void;
  onReceive: () => void;
  onOpenNetwork: () => void;
  onOpenAccounts: () => void;
}) {
  const { state, selectedAccount } = useWallet();
  const balances = useBalances(state);
  const { data: chains = [] } = useChains();
  const lock = useLock();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tokens");
  const [revealOpen, setRevealOpen] = useState(false);

  if (!state) return null;
  const network = chains.find((c) => c.id === state.selectedChainId);
  const netStyle = networkStyle(state.selectedChainId);

  function copyAddress() {
    if (!selectedAccount) return;
    void navigator.clipboard.writeText(selectedAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const native = balances.data?.native;
  const tokens = balances.data?.tokens ?? [];
  const hasAssets = native
    ? BigInt(native.balance) > 0n || tokens.length > 0
    : false;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3">
        <button
          type="button"
          onClick={onOpenAccounts}
          className="size-[30px] flex-none rounded-full"
          style={{
            background: "linear-gradient(135deg, var(--primary), #8B5CF6)",
          }}
          aria-label="Accounts"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onOpenAccounts}
            className="flex items-center gap-1.5"
          >
            <span className="text-sm font-bold">
              {selectedAccount?.label ?? "Account"}
            </span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={copyAddress}
            className="flex items-center gap-1.5"
          >
            <span className="font-mono text-[11px] text-muted-foreground">
              {selectedAccount ? truncateAddress(selectedAccount.address) : ""}
            </span>
            {copied ? (
              <CheckIcon className="size-3 text-success" />
            ) : (
              <CopyIcon className="size-[11px] text-muted-foreground" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenNetwork}
          className="flex items-center gap-1.5 border border-border bg-secondary px-2 py-1.5"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: netStyle.color }}
          />
          <span className="text-xs font-semibold text-[#16181D]">
            {network?.name ?? "Network"}
          </span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid size-[30px] place-items-center border border-border bg-card"
            >
              <EllipsisVerticalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRevealOpen(true)}>
              <EyeIcon className="size-3.5" /> Recovery phrase
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => lock.mutate()}>
              <LockIcon className="size-3.5" /> Lock
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* balance */}
      <div className="px-4 pt-[18px] pb-4">
        <div className="mb-[7px] text-xs font-semibold text-muted-foreground">
          Total balance
        </div>
        {balances.isPending ? (
          <div className="h-[30px] w-44 animate-pulse bg-[#ECEEF1]" />
        ) : (
          <div className="font-sans text-[30px] leading-none font-bold tracking-tight tabular-nums">
            {native
              ? `${formatBalance(native.balance, native.decimals)} ${native.symbol}`
              : "—"}
          </div>
        )}
        {/* allocation bar — populated once a price feed lands */}
        <div className="mt-4 h-1.5 bg-[#EEF0F3]" />
      </div>

      {/* actions */}
      <div className="mx-4 mb-4 grid grid-cols-2 border border-border">
        {/* <Action icon={<PlusIcon />} label="Buy" /> */}
        <Action icon={<ArrowUpIcon />} label="Send" onClick={onSend} />
        {/* <Action icon={<ArrowDownUpIcon />} label="Swap" onClick={onSwap} /> */}
        <Action
          icon={<ArrowDownIcon />}
          label="Receive"
          onClick={onReceive}
          last
        />
      </div>

      {/* tabs */}
      <div className="flex gap-[22px] border-b border-hairline px-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-[11px] text-[13px] ${
              tab === t
                ? "border-primary font-bold text-foreground"
                : "border-transparent font-semibold text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* list region */}
      <div className="dw-scroll flex-1 overflow-y-auto py-0.5">
        {tab !== "Tokens" ? (
          <ComingSoon label={tab} />
        ) : balances.isPending ? (
          <TokenSkeleton />
        ) : balances.isError ? (
          <p className="px-4 py-6 text-sm text-destructive">
            Failed to load balances
          </p>
        ) : !hasAssets ? (
          <EmptyState onReceive={onReceive} />
        ) : (
          <>
            {native && (
              <TokenRow
                color={tokenColor(native.symbol)}
                glyph={tokenGlyph(native.symbol)}
                name={native.name}
                symbol={native.symbol}
                amount={formatBalance(native.balance, native.decimals)}
              />
            )}
            {tokens.map((t) => (
              <TokenRow
                key={t.address}
                color={tokenColor(t.symbol)}
                glyph={tokenGlyph(t.symbol)}
                name={t.name}
                symbol={t.symbol}
                amount={formatBalance(t.balance, t.decimals)}
              />
            ))}
          </>
        )}
      </div>

      <RevealPhraseDialog open={revealOpen} onOpenChange={setRevealOpen} />
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  last,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 bg-card py-3 ${last ? "" : "border-r border-border"}`}
    >
      <span className="text-primary [&_svg]:size-5 [&_svg]:stroke-[1.9]">
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-[#3A3F47]">{label}</span>
    </button>
  );
}

function TokenRow({
  color,
  glyph,
  name,
  symbol,
  amount,
}: {
  color: string;
  glyph: string;
  name: string;
  symbol: string;
  amount: string;
}) {
  return (
    <div className="flex items-center gap-[11px] px-4 py-[9px]">
      <span
        className="grid size-[30px] flex-none place-items-center rounded-full text-[13px] font-bold text-white"
        style={{ background: color }}
      >
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {symbol}
        </div>
      </div>
      <div className="font-mono text-sm font-semibold tabular-nums">
        {amount}
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-base font-bold">{label}</div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">
        Coming soon.
      </div>
    </div>
  );
}

function EmptyState({ onReceive }: { onReceive: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-[#F1F2F4]">
        <PlusIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="text-base font-bold">No tokens yet</div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">
        Add funds to start using DylanWallet.
      </div>
      <div className="mt-[18px] flex w-full gap-2.5">
        <button
          type="button"
          className="flex-1 bg-primary py-[11px] text-[13px] font-bold text-white"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={onReceive}
          className="flex-1 border border-border bg-card py-[11px] text-[13px] font-bold text-[#16181D]"
        >
          Receive
        </button>
      </div>
    </div>
  );
}

function TokenSkeleton() {
  return (
    <div className="py-0.5">
      {[96, 80, 104, 72].map((w, i) => (
        <div key={i} className="flex items-center gap-[11px] px-4 py-[11px]">
          <span className="size-[30px] flex-none animate-pulse rounded-full bg-[#ECEEF1]" />
          <div className="flex-1">
            <div
              className="h-[11px] animate-pulse bg-[#ECEEF1]"
              style={{ width: w }}
            />
            <div className="mt-[7px] h-[9px] w-14 animate-pulse bg-[#F0F1F3]" />
          </div>
          <div className="ml-auto h-[11px] w-14 animate-pulse bg-[#ECEEF1]" />
        </div>
      ))}
    </div>
  );
}
