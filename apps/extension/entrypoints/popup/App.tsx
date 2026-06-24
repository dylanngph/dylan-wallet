import { WalletIcon } from "lucide-react";
import { Spinner } from "@dylan-wallet/ui/components/spinner";
import { useWalletState } from "../../lib/queries";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { Home } from "./screens/Home";
import { NetworkSwitcher } from "./screens/NetworkSwitcher";

export function App() {
  const { data: state, isPending } = useWalletState();

  return (
    <div className="flex min-h-[540px] w-[360px] flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <WalletIcon className="size-4" />
          <span className="text-sm font-semibold tracking-wide">Dylan Wallet</span>
        </div>
        {state?.unlocked && <NetworkSwitcher selectedChainId={state.selectedChainId} />}
      </header>
      <main className="flex flex-1 flex-col p-4">
        {isPending || !state ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : !state.initialized ? (
          <Onboarding />
        ) : !state.unlocked ? (
          <Unlock />
        ) : (
          <Home state={state} />
        )}
      </main>
    </div>
  );
}
