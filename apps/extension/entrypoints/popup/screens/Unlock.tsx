import { useState } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { sendMessage } from "../../../lib/messaging";

export function Unlock({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await sendMessage({ type: "unlock", password });
      onUnlocked();
    } catch {
      setError("Incorrect password");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-1 flex-col justify-center gap-4 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <LockIcon className="size-5" />
        </div>
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your password to unlock.</p>
      </div>
      <Input
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || password.length === 0}>
        Unlock
      </Button>
    </form>
  );
}
