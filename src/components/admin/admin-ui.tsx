import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
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
    <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground">
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
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
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
  return <div className={cn("rounded-lg border bg-card p-4", className)}>{children}</div>;
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
    <Card className="min-h-[120px]">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-1 text-2xl">{value}</CardTitle>
        </div>
        {Icon ? (
          <span className="rounded-md bg-muted p-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
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
    <section id={id} className={cn("rounded-lg border bg-card", className)}>
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function RowActions({
  items
}: {
  items: Array<{ label: string; href?: string; disabled?: boolean }>;
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border bg-background hover:bg-muted">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Abrir ações</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border bg-white p-1 shadow-lg">
        {items.map((item) =>
          item.href && !item.disabled ? (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground opacity-70"
            >
              {item.label}
            </span>
          )
        )}
      </div>
    </details>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
        <div key={item.label} className="flex justify-between gap-4 border-b py-2 last:border-b-0">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right font-medium">{item.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
