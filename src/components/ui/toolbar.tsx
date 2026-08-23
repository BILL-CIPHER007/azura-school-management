import type * as React from "react";
import { cn } from "@/lib/utils";

export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between", className)}
      {...props}
    />
  );
}
