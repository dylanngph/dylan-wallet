import { CheckIcon, PlusIcon } from "lucide-react";
import { BottomSheet } from "../../../components/BottomSheet";
import { useWallet } from "../../../context/wallet-context";
import { useAddAccount, useSelectAccount } from "../../../hooks/queries";
import { truncateAddress } from "../../../utils/format";

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, selectedAccount } = useWallet();
  const selectAccount = useSelectAccount();
  const addAccount = useAddAccount();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Accounts"
      footer={
        <button
          type="button"
          onClick={() => addAccount.mutate(undefined)}
          disabled={addAccount.isPending}
          className="flex w-full items-center justify-center gap-2 border border-primary/20 bg-primary/10 py-3 text-sm font-bold text-primary"
        >
          <PlusIcon className="size-[17px]" /> Create account
        </button>
      }
    >
      {state?.accounts.map((account) => (
        <button
          key={account.index}
          type="button"
          onClick={() => {
            selectAccount.mutate(account.index);
            onClose();
          }}
          className="flex w-full items-center gap-3 border-b border-hairline bg-card px-4 py-[13px] text-left"
        >
          <span
            className="grid size-[34px] flex-none place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), #8B5CF6)" }}
          >
            {account.label.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{account.label}</div>
            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {truncateAddress(account.address)}
            </div>
          </div>
          {account.index === selectedAccount?.index && (
            <CheckIcon className="size-[17px] text-primary" />
          )}
        </button>
      ))}
    </BottomSheet>
  );
}
