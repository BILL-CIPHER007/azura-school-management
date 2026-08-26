import type React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  action
}: {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-56 bg-[linear-gradient(145deg,transparent_0_42%,hsl(var(--school-primary-soft))_43%_64%,hsl(var(--school-blue-100))_65%_100%)]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {breadcrumbs?.length ? (
            <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs font-medium text-text-muted">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                  {item.href ? (
                    <Link href={item.href} className="hover:text-school-primary">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-normal text-text-primary sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function AdminToolbar({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", className)}>{children}</div>;
}

export function AdminMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <Card className="min-h-[108px] overflow-hidden shadow-sm">
      <CardHeader className="flex-row items-start justify-between gap-2 pb-1.5">
        <div>
          <CardDescription className="text-[13px] text-text-secondary">{label}</CardDescription>
          <CardTitle className="mt-1 text-2xl font-semibold text-school-navy">{value}</CardTitle>
        </div>
        {Icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-school-primary text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </CardHeader>
      {detail ? (
        <CardContent>
          <Badge variant={tone}>{detail}</Badge>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function AdminSection({
  id,
  title,
  description,
  action,
  children,
  className
}: {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("overflow-hidden rounded-lg border border-border bg-surface shadow-sm", className)}>
      <div className="flex flex-col gap-2 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-school-navy">{title}</h2>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-school-primary-soft/50 p-8 text-center">
      <h3 className="font-semibold text-school-navy">{title}</h3>
      {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

export function DefinitionList({
  items
}: {
  items: Array<{ label: string; value?: React.ReactNode }>;
}) {
  return (
    <dl className="grid gap-2 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
          <dt className="text-text-secondary">{item.label}</dt>
          <dd className="text-right font-medium text-text-primary">{item.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
