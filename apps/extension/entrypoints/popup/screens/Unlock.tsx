import { useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { BrandMark } from "../../../components/BrandMark";
import { useResetWallet, useUnlock } from "../../../hooks/queries";

const INPUT =
  "w-full border border-border bg-card px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground";

export function Unlock() {
  const [view, setView] = useState<"unlock" | "reset">("unlock");
  return view === "reset" ? (
    <ResetWallet onCancel={() => setView("unlock")} />
  ) : (
    <UnlockForm onForgot={() => setView("reset")} />
  );
}

function UnlockForm({ onForgot }: { onForgot: () => void }) {
  const [password, setPassword] = useState("");
  const unlock = useUnlock();

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        unlock.mutate(password);
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <BrandMark size={56} />
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your password to unlock DylanWallet.
          </p>
        </div>
        <div className="w-full space-y-2">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={INPUT}
          />
          {unlock.isError && (
            <p className="text-left text-sm text-destructive">Incorrect password</p>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <button
          type="submit"
          disabled={unlock.isPending || password.length === 0}
          className="w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-50"
        >
          {unlock.isPending ? "Unlocking..." : "Unlock"}
        </button>
        <button
          type="button"
          onClick={onForgot}
          className="w-full text-center text-[13px] font-semibold text-primary"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}

function ResetWallet({ onCancel }: { onCancel: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const reset = useResetWallet();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-warning-muted">
          <TriangleAlertIcon className="size-7 text-warning" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">Reset wallet</h1>
          <p className="text-sm text-muted-foreground">
            Your password can&apos;t be recovered. Resetting erases this wallet from the device —
            you can restore it later with your recovery phrase.
          </p>
        </div>
        <label className="flex items-start gap-2.5 text-left text-[13px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          I have my recovery phrase saved and understand my accounts will be removed from this
          device.
        </label>
      </div>
      <div className="space-y-2.5">
        <button
          type="button"
          disabled={!acknowledged || reset.isPending}
          onClick={() => reset.mutate()}
          className="w-full bg-destructive py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
        >
          {reset.isPending ? "Resetting..." : "Reset wallet"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-border bg-card py-3.5 text-[15px] font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
