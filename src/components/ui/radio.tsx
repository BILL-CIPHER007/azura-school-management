import type * as React from "react";
import { cn } from "@/lib/utils";

export function Radio({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={cn(
        "h-5 w-5 shrink-0 appearance-none rounded-full border border-input bg-surface shadow-sm transition-colors checked:border-[6px] checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
