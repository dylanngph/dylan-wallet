import { useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { BottomSheet } from "../../../components/BottomSheet";
import { useChains, useSelectChain } from "../../../hooks/queries";
import { networkStyle } from "../../../utils/brand";
import { AddChainDialog } from "./AddChainDialog";

export function NetworkSheet({
  open,
  onClose,
  selectedChainId,
}: {
  open: boolean;
  onClose: () => void;
  selectedChainId: number;
}) {
  const { data: chains = [] } = useChains();
  const selectChain = useSelectChain();
  const [showTest, setShowTest] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const visible = chains.filter((c) => showTest || !c.testnet);

  return (
    <>
      <BottomSheet
        open={open && !addOpen}
        onClose={onClose}
        title="Select network"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Show test networks</span>
            <button
              type="button"
              onClick={() => setShowTest((v) => !v)}
              className={`relative block h-[22px] w-[38px] rounded-full transition-colors ${showTest ? "bg-primary" : "bg-[#E1E3E7]"}`}
            >
              <span
                className={`absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-all ${showTest ? "left-[18px]" : "left-0.5"}`}
              />
            </button>
          </div>
        }
      >
        {visible.map((chain) => {
          const style = networkStyle(chain.id);
          return (
            <button
              key={chain.id}
              type="button"
              onClick={() => {
                selectChain.mutate(chain.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 border-b border-hairline bg-card px-4 py-[13px] text-left"
            >
              <span
                className="grid size-[34px] flex-none place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: style.color }}
              >
                {style.glyph}
              </span>
              <span className="flex-1 text-[15px] font-semibold">
                {chain.name}
                {chain.testnet && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">testnet</span>
                )}
              </span>
              {chain.id === selectedChainId && <CheckIcon className="size-[18px] text-primary" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center gap-3 bg-card px-4 py-[13px] text-left text-primary"
        >
          <span className="grid size-[34px] flex-none place-items-center rounded-full border border-primary/30 bg-primary/10">
            <PlusIcon className="size-4" />
          </span>
          <span className="flex-1 text-[15px] font-semibold">Add custom network</span>
        </button>
      </BottomSheet>
      <AddChainDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
