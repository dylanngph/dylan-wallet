import type { ReactNode } from "react";
import { WalletIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import type { ApprovalPayload, DappTx } from "../../lib/dapp-protocol";
import { useApproval, useChains, useResolveApproval, useWalletState } from "../../lib/queries";
import { formatBalance, truncateAddress } from "../../lib/format";
import { Unlock } from "../popup/screens/Unlock";

export function ApprovalApp() {
  const id = new URLSearchParams(window.location.search).get("id") ?? "";
  const { data: state } = useWalletState();
  const approval = useApproval(id);
  const resolve = useResolveApproval();

  function decide(approved: boolean) {
    resolve.mutate({ id, approved }, { onSettled: () => window.close() });
  }

  return (
    <div className="flex min-h-[560px] w-[380px] flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <WalletIcon className="size-4" />
        <span className="text-sm font-semibold tracking-wide">Dylan Wallet</span>
      </header>
      <main className="flex flex-1 flex-col p-4">
        {!state ? (
          <Center>
            <Spinner />
          </Center>
        ) : !state.unlocked ? (
          <Unlock />
        ) : approval.isPending ? (
          <Center>
            <Spinner />
          </Center>
        ) : approval.isError || !approval.data ? (
          <Center>
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                This request has expired or was already handled.
              </p>
              <Button variant="outline" onClick={() => window.close()}>
                Close
              </Button>
            </div>
          </Center>
        ) : (
          <ApprovalView
            payload={approval.data}
            account={
              state.accounts.find((a) => a.index === state.selectedIndex)?.address ?? ""
            }
            chainId={state.selectedChainId}
            busy={resolve.isPending}
            onApprove={() => decide(true)}
            onReject={() => decide(false)}
          />
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center">{children}</div>;
}

function ApprovalView({
  payload,
  account,
  chainId,
  busy,
  onApprove,
  onReject,
}: {
  payload: ApprovalPayload;
  account: string;
  chainId: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const titles: Record<ApprovalPayload["type"], string> = {
    connect: "Connection request",
    signMessage: "Signature request",
    signTypedData: "Signature request",
    sendTransaction: "Confirm transaction",
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">{titles[payload.type]}</h1>
        <p className="font-mono text-xs break-all text-muted-foreground">{payload.origin}</p>
      </div>

      <div className="flex-1">
        {payload.type === "connect" && (
          <p className="text-sm text-muted-foreground">
            This site wants to connect to your wallet and view your account{" "}
            <span className="font-mono text-foreground">{truncateAddress(account)}</span>.
            It will not be able to move funds without your approval.
          </p>
        )}
        {payload.type === "signMessage" && (
          <Field label="Message">
            <pre className="max-h-48 overflow-auto border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">
              {payload.message}
            </pre>
          </Field>
        )}
        {payload.type === "signTypedData" && <TypedData json={payload.typedData} />}
        {payload.type === "sendTransaction" && (
          <TransactionDetails tx={payload.tx} chainId={chainId} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        <Button onClick={onApprove} disabled={busy}>
          {payload.type === "connect" ? "Connect" : payload.type === "sendTransaction" ? "Confirm" : "Sign"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function TypedData({ json }: { json: string }) {
  let pretty = json;
  let primaryType = "";
  try {
    const parsed = JSON.parse(json);
    pretty = JSON.stringify(parsed, null, 2);
    primaryType = parsed.primaryType ?? parsed.domain?.name ?? "";
  } catch {
    /* show raw */
  }
  return (
    <Field label={primaryType ? `Typed data · ${primaryType}` : "Typed data"}>
      <pre className="max-h-56 overflow-auto border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">
        {pretty}
      </pre>
    </Field>
  );
}

function TransactionDetails({ tx, chainId }: { tx: DappTx; chainId: number }) {
  const { data: chains = [] } = useChains();
  const symbol = chains.find((c) => c.id === chainId)?.nativeSymbol ?? "";
  const valueWei = tx.value ? BigInt(tx.value).toString() : "0";

  return (
    <div className="flex flex-col gap-2 text-sm">
      <Row label="To" value={tx.to ? truncateAddress(tx.to) : "Contract creation"} mono />
      <Row label="Amount" value={`${formatBalance(valueWei, 18)} ${symbol}`} />
      <Row label="Data" value={tx.data && tx.data !== "0x" ? "Contract interaction" : "None"} />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}
