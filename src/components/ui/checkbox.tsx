import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, id, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-surface/40",
          className,
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </button>
    );
  },
);
Checkbox.displayName = "Checkbox";
