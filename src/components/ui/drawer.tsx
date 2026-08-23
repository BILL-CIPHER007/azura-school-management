import type * as React from "react";
import { cn } from "@/lib/utils";

export function Drawer({
  open,
  title,
  children,
  side = "right",
  className
}: {
  open?: boolean;
  title: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-school-navy/40">
      <aside
        className={cn(
          "absolute top-0 h-full w-full max-w-sm bg-surface p-6 shadow-lg",
          side === "right" ? "right-0" : "left-0",
          className
        )}
      >
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <div className="mt-5">{children}</div>
      </aside>
    </div>
  );
}
