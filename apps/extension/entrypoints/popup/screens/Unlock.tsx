import { useState } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { useUnlock } from "../../../lib/queries";

export function Unlock() {
  const [password, setPassword] = useState("");
  const unlock = useUnlock();

  return (
    <form
      className="flex flex-1 flex-col justify-center gap-4 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        unlock.mutate(password);
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center bg-muted">
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
      {unlock.isError && <p className="text-sm text-destructive">Incorrect password</p>}
      <Button type="submit" disabled={unlock.isPending || password.length === 0}>
        {unlock.isPending ? "Unlocking..." : "Unlock"}
      </Button>
    </form>
  );
}
