import { useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dylan-wallet/ui/components/dropdown-menu";
import { useChains, useSelectChain } from "../../../lib/queries";
import { AddChainDialog } from "./AddChainDialog";

export function NetworkSwitcher({ selectedChainId }: { selectedChainId: number }) {
  const [addOpen, setAddOpen] = useState(false);
  const { data: chains = [] } = useChains();
  const selectChain = useSelectChain();

  const current = chains.find((c) => c.id === selectedChainId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="xs" className="gap-1.5 normal-case tracking-normal">
            <span className="size-1.5 bg-primary" />
            {current?.name ?? "Network"}
            <ChevronDownIcon className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 w-52 overflow-y-auto">
          {chains.map((chain) => (
            <DropdownMenuItem key={chain.id} onClick={() => selectChain.mutate(chain.id)}>
              <span className="flex-1">
                {chain.name}
                {chain.testnet && (
                  <span className="ml-1 text-xs text-muted-foreground">testnet</span>
                )}
              </span>
              {chain.id === selectedChainId && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setAddOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" /> Add custom network
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddChainDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
