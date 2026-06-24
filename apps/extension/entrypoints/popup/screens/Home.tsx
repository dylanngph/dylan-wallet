import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, LockIcon, PlusIcon } from "lucide-react";
import type { AccountMeta } from "@dylan-wallet/core";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { sendMessage, type WalletState } from "../../../lib/messaging";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Home({ state, refresh }: { state: WalletState; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const selected =
    state.accounts.find((a) => a.index === state.selectedIndex) ?? state.accounts[0];

  async function addAccount() {
    setBusy(true);
    try {
      await sendMessage({ type: "addAccount" });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function select(index: number) {
    await sendMessage({ type: "selectAccount", index });
    refresh();
  }

  async function copy(address: string) {
    await navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Accounts
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => sendMessage({ type: "lock" }).then(refresh)}
        >
          <LockIcon /> Lock
        </Button>
      </div>

      {selected && (
        <div className="rounded-md border bg-muted/40 p-3">
          <div className="text-sm font-semibold">{selected.label}</div>
          <button
            type="button"
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => copy(selected.address)}
          >
            <span className="font-mono">{truncate(selected.address)}</span>
            {copied === selected.address ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {state.accounts.map((account) => (
          <AccountRow
            key={account.index}
            account={account}
            selected={account.index === selected?.index}
            onSelect={() => select(account.index)}
          />
        ))}
      </ul>

      <Button variant="outline" size="sm" onClick={addAccount} disabled={busy}>
        <PlusIcon /> Add account
      </Button>

      <RevealPhrase className="mt-auto" />
    </div>
  );
}

function AccountRow({
  account,
  selected,
  onSelect,
}: {
  account: AccountMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
          selected ? "bg-accent" : ""
        }`}
      >
        <span className="font-medium">{account.label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {truncate(account.address)}
        </span>
      </button>
    </li>
  );
}

function RevealPhrase({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setError(null);
    try {
      setPhrase(await sendMessage({ type: "exportMnemonic", password }));
    } catch {
      setError("Incorrect password");
    }
  }

  function reset() {
    setOpen(false);
    setPassword("");
    setPhrase(null);
    setError(null);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className={className} onClick={() => setOpen(true)}>
        <EyeIcon /> Reveal recovery phrase
      </Button>
    );
  }

  return (
    <div className={`flex flex-col gap-2 rounded-md border p-3 ${className ?? ""}`}>
      {phrase ? (
        <>
          <p className="text-xs text-destructive">
            Never share this phrase. Anyone with it controls your funds.
          </p>
          <p className="rounded bg-muted p-2 font-mono text-sm leading-relaxed">{phrase}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            Hide
          </Button>
        </>
      ) : (
        <>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirm password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={reveal} disabled={password.length === 0}>
              Reveal
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
