import { useState } from "react";
import { ArrowLeftIcon, CopyIcon, PlusIcon, DownloadIcon } from "lucide-react";
import { isValidRecoveryPhrase } from "@dylan-wallet/core";
import { Button } from "@dylan-wallet/ui/components/button";
import { Input } from "@dylan-wallet/ui/components/input";
import { Label } from "@dylan-wallet/ui/components/label";
import { Textarea } from "@dylan-wallet/ui/components/textarea";
import { sendMessage } from "../../../lib/messaging";

const MIN_PASSWORD = 8;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [view, setView] = useState<"choose" | "create" | "import">("choose");

  if (view === "choose") {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6 text-center">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Welcome</h1>
          <p className="text-sm text-muted-foreground">
            Create a new wallet or import an existing recovery phrase. Your keys never
            leave this device.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setView("create")}>
            <PlusIcon /> Create a new wallet
          </Button>
          <Button variant="outline" onClick={() => setView("import")}>
            <DownloadIcon /> Import recovery phrase
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 self-start"
        onClick={() => setView("choose")}
      >
        <ArrowLeftIcon /> Back
      </Button>
      {view === "create" ? <CreateFlow onDone={onDone} /> : <ImportFlow onDone={onDone} />}
    </div>
  );
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
        />
      </div>
    </>
  );
}

function passwordError(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  if (password !== confirm) return "Passwords do not match";
  return null;
}

function CreateFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"password" | "seed">("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seed, setSeed] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toSeedStep() {
    const err = passwordError(password, confirm);
    if (err) return setError(err);
    setError(null);
    setBusy(true);
    try {
      setSeed(await sendMessage({ type: "generateSeedPhrase" }));
      setStep("seed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await sendMessage({ type: "createVault", password, mnemonic: seed });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (step === "password") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <h2 className="text-base font-semibold">Set a password</h2>
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
        <Button className="mt-auto" onClick={toSeedStep} disabled={busy}>
          Continue
        </Button>
      </div>
    );
  }

  const words = seed.split(" ");
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="text-base font-semibold">Back up your recovery phrase</h2>
      <p className="text-sm text-muted-foreground">
        Write these 12 words down in order and keep them somewhere safe. Anyone with this
        phrase can take your funds.
      </p>
      <ol className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        {words.map((word, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
            <span className="font-medium">{word}</span>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => void navigator.clipboard.writeText(seed)}
      >
        <CopyIcon /> Copy
      </Button>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        I&apos;ve saved my recovery phrase
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="mt-auto" onClick={finish} disabled={!acknowledged || busy}>
        Create wallet
      </Button>
    </div>
  );
}

function ImportFlow({ onDone }: { onDone: () => void }) {
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const normalized = phrase.trim().replace(/\s+/g, " ");
    if (!isValidRecoveryPhrase(normalized)) return setError("Invalid recovery phrase");
    const err = passwordError(password, confirm);
    if (err) return setError(err);
    setError(null);
    setBusy(true);
    try {
      await sendMessage({ type: "createVault", password, mnemonic: normalized });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="text-base font-semibold">Import recovery phrase</h2>
      <div className="space-y-1.5">
        <Label htmlFor="phrase">Recovery phrase</Label>
        <Textarea
          id="phrase"
          rows={3}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Enter your 12 or 24 word phrase"
        />
      </div>
      <PasswordFields
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="mt-auto" onClick={submit} disabled={busy}>
        Import wallet
      </Button>
    </div>
  );
}
