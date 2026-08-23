import type * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-school-primary-soft text-school-blue-700 ring-1 ring-school-blue-100",
  neutral: "bg-muted text-muted-foreground ring-1 ring-border",
  success: "bg-success-soft text-success ring-1 ring-success/15",
  warning: "bg-warning-soft text-warning ring-1 ring-warning/20",
  danger: "bg-danger-soft text-danger ring-1 ring-danger/15",
  info: "bg-info-soft text-info ring-1 ring-info/15"
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
