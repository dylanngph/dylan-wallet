import { Spinner } from "@dylan-wallet/ui/components/spinner";
import { useWallet } from "../../context/wallet-context";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { Wallet } from "./screens/Wallet";

export function App() {
  const { state, isPending } = useWallet();

  return (
    <div className="relative flex h-[600px] w-[400px] flex-col overflow-hidden bg-background font-sans text-foreground">
      {isPending || !state ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : !state.initialized ? (
        <div className="dw-scroll flex flex-1 flex-col overflow-y-auto p-5">
          <Onboarding />
        </div>
      ) : !state.unlocked ? (
        <div className="flex flex-1 flex-col p-5">
          <Unlock />
        </div>
      ) : (
        <Wallet />
      )}
    </div>
  );
}
