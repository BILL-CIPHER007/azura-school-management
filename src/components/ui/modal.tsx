import type * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  children,
  className
}: {
  open?: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-school-navy/40 p-4">
      <section className={cn("w-full max-w-lg rounded-xl border bg-surface p-6 shadow-lg", className)}>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
