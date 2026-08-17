import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function GuardianMetric({
  label,
  value,
  detail,
  alert,
  icon: Icon
}: {
  label: string;
  value: string | number;
  detail?: string;
  alert?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn("rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200", alert && "ring-amber-200")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-primary/70" /> : null}
      </div>
      <strong className="mt-2 block text-2xl font-semibold text-slate-950">{value}</strong>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      {alert ? <p className="mt-2 text-xs font-medium text-amber-700">{alert}</p> : null}
    </div>
  );
}

export function GuardianSection({
  title,
  actionHref,
  actionLabel,
  children,
  className
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg bg-white shadow-sm ring-1 ring-slate-200", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function GuardianStatusBadge({ value }: { value: string }) {
  const variant = value === "Aprovado" ? "success" : value === "Cursando" ? "info" : value === "Reprovado" ? "danger" : "warning";
  return <Badge variant={variant}>{value}</Badge>;
}

export function GuardianEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="font-medium text-slate-950">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
