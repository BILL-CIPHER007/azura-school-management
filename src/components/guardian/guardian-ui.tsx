import type React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GuardianPageHeader({
  title,
  description,
  eyebrow,
  action
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-56 bg-[linear-gradient(145deg,transparent_0_42%,hsl(var(--school-primary-soft))_43%_64%,hsl(var(--school-blue-100))_65%_100%)]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-medium text-school-primary">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-school-navy sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function GuardianMetric({
  label,
  value,
  detail,
  alert,
  alertHref,
  icon: Icon,
  tone = "primary",
  valueClassName
}: {
  label: string;
  value: string | number;
  detail?: string;
  alert?: string;
  alertHref?: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info";
  valueClassName?: string;
}) {
  const toneClass = {
    primary: "bg-school-primary text-white",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    info: "bg-info text-white"
  }[tone];

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", alert && "border-warning/30 bg-warning-soft/45")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-text-secondary">{label}</p>
          <strong className={cn("mt-1 block truncate text-3xl font-semibold text-school-navy", valueClassName)}>
            {value}
          </strong>
        </div>
        {Icon ? (
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm", toneClass)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p> : null}
      {alert && alertHref ? (
        <Link href={alertHref} className="mt-2 inline-flex text-xs font-semibold text-warning hover:underline">
          {alert}
        </Link>
      ) : alert ? (
        <p className="mt-2 text-xs font-semibold text-warning">{alert}</p>
      ) : null}
    </div>
  );
}

export function GuardianSection({
  title,
  description,
  actionHref,
  actionLabel,
  action,
  children,
  className,
  bodyClassName
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-surface shadow-sm", className)}>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-school-navy">{title}</h2>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-medium text-school-primary hover:underline">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          action
        )}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function GuardianStatusBadge({ value }: { value: string }) {
  const variant = value === "Aprovado" ? "success" : value === "Cursando" ? "info" : value === "Reprovado" ? "danger" : "warning";
  return <Badge variant={variant}>{value}</Badge>;
}

export function GuardianEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-school-primary-soft/50 p-8 text-center">
      <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-school-primary shadow-sm">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="font-semibold text-school-navy">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-secondary">{description}</p> : null}
    </div>
  );
}
