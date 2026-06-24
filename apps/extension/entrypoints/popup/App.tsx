import { useCallback, useEffect, useState } from "react";
import { WalletIcon } from "lucide-react";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import { sendMessage, type WalletState } from "../../lib/messaging";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { Home } from "./screens/Home";

export function App() {
  const [state, setState] = useState<WalletState | null>(null);

  const refresh = useCallback(async () => {
    setState(await sendMessage({ type: "getState" }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex min-h-[540px] w-[360px] flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <WalletIcon className="size-4" />
        <span className="text-sm font-semibold tracking-wide">Dylan Wallet</span>
      </header>
      <main className="flex flex-1 flex-col p-4">
        {state === null ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : !state.initialized ? (
          <Onboarding onDone={refresh} />
        ) : !state.unlocked ? (
          <Unlock onUnlocked={refresh} />
        ) : (
          <Home state={state} refresh={refresh} />
        )}
      </main>
    </div>
  );
}
