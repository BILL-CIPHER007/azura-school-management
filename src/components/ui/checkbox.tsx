import type * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className={cn(
          "peer h-5 w-5 appearance-none rounded-sm border border-input bg-surface shadow-sm transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute h-3.5 w-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100" />
    </span>
  );
}
