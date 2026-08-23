import type * as React from "react";
import { cn } from "@/lib/utils";

export function DataTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("data-table", className)} {...props} />;
}

export function DataTableWrap({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("table-wrap", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
