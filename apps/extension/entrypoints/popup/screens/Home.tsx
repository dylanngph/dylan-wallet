import { useState } from "react";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  LockIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dylan-wallet/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dylan-wallet/ui/components/dialog";
import { SeedPhraseDisplay } from "@dylan-wallet/ui/components/seed-phrase";
import { useWallet } from "../../../context/wallet-context";
import {
  useAddAccount,
  useBalances,
  useExportMnemonic,
  useLock,
  useSelectAccount,
} from "../../../hooks/queries";
import { formatBalance, truncateAddress } from "../../../utils/format";
import { CopyableAddress } from "../../../components/CopyableAddress";
import { Send } from "./Send";
import { Receive } from "./Receive";

export function Home() {
  const { state, selectedAccount } = useWallet();
  const [view, setView] = useState<"list" | "send" | "receive">("list");
  const balancesQuery = useBalances(state);
  const lock = useLock();

  if (!state) return null;

  if (view === "receive" && selectedAccount) {
    return <Receive address={selectedAccount.address} onBack={() => setView("list")} />;
  }
  if (view === "send" && balancesQuery.data) {
    return (
      <Send
        balances={balancesQuery.data}
        onBack={() => setView("list")}
        onDone={() => setView("list")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <AccountMenu />

      {selectedAccount && <CopyableAddress address={selectedAccount.address} />}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setView("send")} disabled={!balancesQuery.data}>
          <ArrowUpRightIcon /> Send
        </Button>
        <Button variant="outline" onClick={() => setView("receive")}>
          <ArrowDownLeftIcon /> Receive
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Assets
        </span>
        {balancesQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : balancesQuery.isError ? (
          <p className="text-sm text-destructive">
            {balancesQuery.error.message || "Failed to load balances"}
          </p>
        ) : (
          <ul className="flex flex-col">
            <AssetRow
              symbol={balancesQuery.data.native.symbol}
              name={balancesQuery.data.native.name}
              amount={formatBalance(
                balancesQuery.data.native.balance,
                balancesQuery.data.native.decimals,
              )}
            />
            {balancesQuery.data.tokens.map((t) => (
              <AssetRow
                key={t.address}
                symbol={t.symbol}
                name={t.name}
                amount={formatBalance(t.balance, t.decimals)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <RevealPhrase />
        <Button variant="ghost" size="sm" onClick={() => lock.mutate()}>
          <LockIcon /> Lock
        </Button>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { state, selectedAccount } = useWallet();
  const selectAccount = useSelectAccount();
  const addAccount = useAddAccount();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between normal-case tracking-normal"
        >
          {selectedAccount?.label ?? "Account"}
          <ChevronDownIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {state?.accounts.map((account) => (
          <DropdownMenuItem key={account.index} onClick={() => selectAccount.mutate(account.index)}>
            <span className="flex-1">{account.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {truncateAddress(account.address)}
            </span>
            {account.index === selectedAccount?.index && <CheckIcon className="ml-1 size-3.5" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => addAccount.mutate(undefined)}>
          <PlusIcon className="size-3.5" /> Add account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssetRow({ symbol, name, amount }: { symbol: string; name: string; amount: string }) {
  return (
    <li className="flex items-center justify-between border-b py-2.5 last:border-b-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{symbol}</span>
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <span className="font-mono text-sm">{amount}</span>
    </li>
  );
}

function RevealPhrase() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const exportMnemonic = useExportMnemonic();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword("");
          exportMnemonic.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <EyeIcon /> Recovery phrase
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[320px]">
        <DialogHeader>
          <DialogTitle>Recovery phrase</DialogTitle>
          <DialogDescription>
            Confirm your password to reveal your secret recovery phrase.
          </DialogDescription>
        </DialogHeader>
        {exportMnemonic.data ? (
          <div className="space-y-2">
            <p className="text-xs text-destructive">
              Never share this phrase. Anyone with it controls your funds.
            </p>
            <SeedPhraseDisplay phrase={exportMnemonic.data} />
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Confirm password"
            />
            {exportMnemonic.isError && (
              <p className="text-sm text-destructive">Incorrect password</p>
            )}
            <Button
              className="w-full"
              onClick={() => exportMnemonic.mutate(password)}
              disabled={password.length === 0 || exportMnemonic.isPending}
            >
              Reveal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
