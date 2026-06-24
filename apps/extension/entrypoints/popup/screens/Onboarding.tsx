import { useState } from "react";
import { isValidRecoveryPhrase } from "@dylan-wallet/core";
import { StepTransition } from "@dylan-wallet/ui/components/step-transition";
import {
  SeedPhraseDisplay,
  SeedPhraseInput,
} from "@dylan-wallet/ui/components/seed-phrase";
import { BrandMark } from "../../../components/BrandMark";
import { FlowHeader } from "../../../components/FlowHeader";
import { useCreateVault, useGenerateSeedPhrase } from "../../../hooks/queries";

const MIN_PASSWORD = 8;
const INPUT =
  "w-full border border-border bg-card px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground";
const PRIMARY =
  "w-full bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-50";

export function Onboarding() {
  const [view, setView] = useState<"choose" | "create" | "import">("choose");

  if (view === "choose") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <BrandMark size={56} />
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold">Welcome to DylanWallet</h1>
            <p className="text-sm text-muted-foreground">
              A non-custodial wallet. Create a new wallet or import an existing recovery phrase —
              your keys never leave this device.
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          <button type="button" onClick={() => setView("create")} className={PRIMARY}>
            Create a new wallet
          </button>
          <button
            type="button"
            onClick={() => setView("import")}
            className="w-full border border-border bg-card py-3.5 text-[15px] font-bold"
          >
            Import recovery phrase
          </button>
        </div>
      </div>
    );
  }

  return view === "create" ? (
    <CreateFlow onExit={() => setView("choose")} />
  ) : (
    <ImportFlow onExit={() => setView("choose")} />
  );
}

function passwordError(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD)
    return `Password must be at least ${MIN_PASSWORD} characters`;
  if (password !== confirm) return "Passwords do not match";
  return null;
}

function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
}: {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          className={INPUT}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          className={INPUT}
        />
      </div>
    </>
  );
}

const CREATE_STEPS = ["Password", "Backup"];

function CreateFlow({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seed, setSeed] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useGenerateSeedPhrase();
  const createVault = useCreateVault();

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function toBackup() {
    const err = passwordError(password, confirm);
    if (err) return setError(err);
    setError(null);
    try {
      setSeed(await generate.mutateAsync());
      go(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = generate.isPending || createVault.isPending;

  return (
    <div className="flex h-full flex-col">
      <FlowHeader
        steps={CREATE_STEPS}
        current={step}
        onBack={() => (step === 0 ? onExit() : go(0))}
      />
      <StepTransition stepKey={step} direction={direction}>
        {step === 0 ? (
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              This password encrypts your wallet on this device. It can&apos;t be recovered.
            </p>
            <PasswordFields
              password={password}
              confirm={confirm}
              onPassword={setPassword}
              onConfirm={setConfirm}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="button" className={`mt-auto ${PRIMARY}`} onClick={toBackup} disabled={busy}>
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Write these words down in order and keep them safe. Anyone with this phrase can take
              your funds.
            </p>
            <SeedPhraseDisplay phrase={seed} />
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I&apos;ve saved my recovery phrase
            </label>
            {createVault.isError && (
              <p className="text-sm text-destructive">{createVault.error.message}</p>
            )}
            <button
              type="button"
              className={`mt-auto ${PRIMARY}`}
              onClick={() => createVault.mutate({ password, mnemonic: seed })}
              disabled={!acknowledged || busy}
            >
              Create wallet
            </button>
          </div>
        )}
      </StepTransition>
    </div>
  );
}

const IMPORT_STEPS = ["Phrase", "Password"];

function ImportFlow({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createVault = useCreateVault();

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function toPassword() {
    if (!isValidRecoveryPhrase(phrase)) return setError("Invalid recovery phrase");
    setError(null);
    go(1);
  }

  function submit() {
    const err = passwordError(password, confirm);
    if (err) return setError(err);
    setError(null);
    createVault.mutate({ password, mnemonic: phrase.trim().replace(/\s+/g, " ") });
  }

  return (
    <div className="flex h-full flex-col">
      <FlowHeader
        steps={IMPORT_STEPS}
        current={step}
        onBack={() => (step === 0 ? onExit() : go(0))}
      />
      <StepTransition stepKey={step} direction={direction}>
        {step === 0 ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Enter your phrase</span>
              <div className="flex gap-1.5">
                {([12, 24] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setWordCount(count)}
                    className={`px-3 py-1.5 text-xs font-bold ${
                      wordCount === count
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <SeedPhraseInput wordCount={wordCount} value={phrase} onChange={setPhrase} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="button" className={`mt-auto ${PRIMARY}`} onClick={toPassword}>
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Set a password to encrypt the imported wallet on this device.
            </p>
            <PasswordFields
              password={password}
              confirm={confirm}
              onPassword={setPassword}
              onConfirm={setConfirm}
            />
            {(error || createVault.isError) && (
              <p className="text-sm text-destructive">{error ?? createVault.error?.message}</p>
            )}
            <button
              type="button"
              className={`mt-auto ${PRIMARY}`}
              onClick={submit}
              disabled={createVault.isPending}
            >
              Import wallet
            </button>
          </div>
        )}
      </StepTransition>
    </div>
  );
}
