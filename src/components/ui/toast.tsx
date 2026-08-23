import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Toast({
  title,
  description,
  tone = "info",
  className
}: {
  title: string;
  description?: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-surface p-4 shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        <Badge variant={tone}>{tone}</Badge>
      </div>
    </div>
  );
}
