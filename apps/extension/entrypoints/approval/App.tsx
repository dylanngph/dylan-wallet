import type { ReactNode } from "react";
import { WalletIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import type { ApprovalPayload, DappTx } from "../../lib/dapp-protocol";
import { useWallet } from "../../context/wallet-context";
import { useApproval, useChains, useResolveApproval } from "../../hooks/queries";
import { formatBalance, truncateAddress } from "../../utils/format";
import { DetailRow } from "../../components/DetailRow";
import { Unlock } from "../popup/screens/Unlock";

export function ApprovalApp() {
  const id = new URLSearchParams(window.location.search).get("id") ?? "";
  const { state } = useWallet();
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

const TITLES: Record<ApprovalPayload["type"], string> = {
  connect: "Connection request",
  signMessage: "Signature request",
  signTypedData: "Signature request",
  sendTransaction: "Confirm transaction",
  addChain: "Add network",
};

const CONFIRM_LABELS: Record<ApprovalPayload["type"], string> = {
  connect: "Connect",
  signMessage: "Sign",
  signTypedData: "Sign",
  sendTransaction: "Confirm",
  addChain: "Add network",
};

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
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">{TITLES[payload.type]}</h1>
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
        {payload.type === "addChain" && (
          <div className="flex flex-col gap-2 text-sm">
            <DetailRow label="Network" value={payload.chain.name} />
            <DetailRow label="Chain ID" value={String(payload.chain.id)} />
            <DetailRow label="Symbol" value={payload.chain.symbol} />
            <DetailRow label="RPC URL" value={payload.chain.rpcUrl} mono />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        <Button onClick={onApprove} disabled={busy}>
          {CONFIRM_LABELS[payload.type]}
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
      <DetailRow label="To" value={tx.to ? truncateAddress(tx.to) : "Contract creation"} mono />
      <DetailRow label="Amount" value={`${formatBalance(valueWei, 18)} ${symbol}`} />
      <DetailRow label="Data" value={tx.data && tx.data !== "0x" ? "Contract interaction" : "None"} />
    </div>
  );
}
