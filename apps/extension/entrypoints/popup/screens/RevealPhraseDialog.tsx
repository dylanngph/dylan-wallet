import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dylan-wallet/ui/components/dialog";
import { Input } from "@dylan-wallet/ui/components/input";
import { SeedPhraseDisplay } from "@dylan-wallet/ui/components/seed-phrase";
import { useExportMnemonic } from "../../../hooks/queries";

export function RevealPhraseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const exportMnemonic = useExportMnemonic();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setPassword("");
          exportMnemonic.reset();
        }
      }}
    >
      <DialogContent className="w-[340px]">
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
            <button
              type="button"
              onClick={() => exportMnemonic.mutate(password)}
              disabled={password.length === 0 || exportMnemonic.isPending}
              className="w-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Reveal
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
