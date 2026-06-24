import { useState } from "react";
import { useWallet } from "../../../context/wallet-context";
import { WalletHome } from "./WalletHome";
import { WalletSend } from "./WalletSend";
import { WalletReceive } from "./WalletReceive";
import { WalletSwap } from "./WalletSwap";
import { NetworkSheet } from "./NetworkSheet";
import { AccountSheet } from "./AccountSheet";

type Screen = "home" | "send" | "receive" | "swap";
type Overlay = null | "network" | "accounts";

/** The authenticated wallet experience: screen routing + bottom sheets. */
export function Wallet() {
  const { state } = useWallet();
  const [screen, setScreen] = useState<Screen>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);

  if (!state) return null;
  const goHome = () => setScreen("home");

  return (
    <>
      {screen === "home" && (
        <WalletHome
          onSend={() => setScreen("send")}
          onSwap={() => setScreen("swap")}
          onReceive={() => setScreen("receive")}
          onOpenNetwork={() => setOverlay("network")}
          onOpenAccounts={() => setOverlay("accounts")}
        />
      )}
      {screen === "send" && <WalletSend onBack={goHome} />}
      {screen === "receive" && (
        <WalletReceive onBack={goHome} onOpenAccounts={() => setOverlay("accounts")} />
      )}
      {screen === "swap" && <WalletSwap onBack={goHome} />}

      <NetworkSheet
        open={overlay === "network"}
        onClose={() => setOverlay(null)}
        selectedChainId={state.selectedChainId}
      />
      <AccountSheet open={overlay === "accounts"} onClose={() => setOverlay(null)} />
    </>
  );
}
