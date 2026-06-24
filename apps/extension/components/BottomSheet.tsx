import type { ReactNode } from "react";
import { XIcon } from "lucide-react";

/**
 * A bottom sheet anchored to the wallet popup container (which is
 * `position: relative; overflow: hidden`). Backdrop dismisses on click.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        className="absolute inset-0 z-40 bg-foreground/40 animate-in fade-in"
      />
      <div className="animate-in slide-in-from-bottom-4 absolute inset-x-0 bottom-0 z-50 flex max-h-[82%] flex-col border-t border-border bg-card shadow-[0_-14px_44px_rgba(15,23,42,0.2)] duration-200">
        <div className="flex items-center justify-between border-b border-hairline p-4">
          <span className="text-base font-bold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-[30px] place-items-center bg-secondary text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="dw-scroll overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-hairline p-4">{footer}</div>}
      </div>
    </>
  );
}
