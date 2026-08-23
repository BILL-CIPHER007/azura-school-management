import type * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropdown({
  label = "Abrir menu",
  trigger,
  children,
  className
}: {
  label?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group relative", className)}>
      <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-md border bg-surface px-3 text-sm font-medium shadow-sm hover:bg-school-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20">
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
        <span className="sr-only">{label}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 min-w-48 rounded-lg border bg-surface p-1 shadow-lg">
        {children}
      </div>
    </details>
  );
}

export function DropdownItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md px-3 py-2 text-sm hover:bg-muted", className)} {...props} />;
}
