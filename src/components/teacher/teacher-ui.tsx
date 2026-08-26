import type React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TeacherPageHeader({
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
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
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

export function TeacherMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const toneClass = {
    primary: "bg-school-primary text-white",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    info: "bg-info text-white"
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] text-text-secondary">{label}</p>
          <strong className="mt-1 block text-2xl font-semibold text-school-navy">{value}</strong>
        </div>
        {Icon ? (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm", toneClass)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-2 text-xs text-text-muted">{detail}</p> : null}
    </div>
  );
}

export function TeacherSection({
  title,
  description,
  action,
  children,
  className
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-surface shadow-sm", className)}>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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

export function TeacherBreadcrumb({
  items
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-school-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">{item.label}</span>
          )}
          {index < items.length - 1 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
        </span>
      ))}
    </nav>
  );
}

export function ClassTabs({
  classroomId,
  activeTab,
  subjectId,
  periodId
}: {
  classroomId: string;
  activeTab: string;
  subjectId?: string;
  periodId?: string;
}) {
  const tabs = [
    { id: "resumo", label: "Resumo" },
    { id: "alunos", label: "Alunos" },
    { id: "notas", label: "Notas" },
    { id: "frequencia", label: "Frequência" }
  ];

  const preserve = new URLSearchParams();
  if (subjectId) preserve.set("subjectId", subjectId);
  if (periodId) preserve.set("periodId", periodId);

  return (
    <div className="overflow-x-auto border-b border-border bg-surface px-3 py-3">
      <div className="flex min-w-fit gap-2">
        {tabs.map((tab) => {
          const params = new URLSearchParams(preserve);
          params.set("tab", tab.id);
          return (
            <Link
              key={tab.id}
              href={`/professor/turmas/${classroomId}?${params.toString()}`}
              className={cn(
                "rounded-md px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-school-primary-soft hover:text-school-primary",
                activeTab === tab.id && "bg-school-primary text-white shadow-sm hover:bg-school-primary hover:text-white"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const variant =
    value === "Regular" || value === "Aprovado"
      ? "success"
      : value === "Frequência baixa" || value === "Reprovado"
        ? "danger"
        : value === "Cursando"
          ? "info"
          : "warning";
  return <Badge variant={variant}>{value}</Badge>;
}
