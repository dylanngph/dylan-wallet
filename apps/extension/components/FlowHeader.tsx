import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@dylan-wallet/ui/components/button";
import { Stepper } from "@dylan-wallet/ui/components/stepper";

/** A back button above a step indicator — shared by the onboarding and send flows. */
export function FlowHeader({
  steps,
  current,
  onBack,
}: {
  steps: string[];
  current: number;
  onBack: () => void;
}) {
  return (
    <div className="mb-4 space-y-3">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeftIcon /> Back
      </Button>
      <Stepper steps={steps} current={current} />
    </div>
  );
}
