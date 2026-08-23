import type * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-text-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}
