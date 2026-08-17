import Link from "next/link";
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TeacherMetric({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-muted-foreground">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold text-slate-950">{value}</strong>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function TeacherSection({
  title,
  action,
  children,
  className
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg bg-white shadow-sm ring-1 ring-slate-200", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
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
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
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
    <div className="overflow-x-auto border-b bg-white">
      <div className="flex min-w-fit gap-1 px-4">
        {tabs.map((tab) => {
          const params = new URLSearchParams(preserve);
          params.set("tab", tab.id);
          return (
            <Link
              key={tab.id}
              href={`/professor/turmas/${classroomId}?${params.toString()}`}
              className={cn(
                "border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground",
                activeTab === tab.id && "border-primary text-primary"
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
  const variant = value === "Aprovado" ? "success" : value === "Cursando" ? "info" : "warning";
  return <Badge variant={variant}>{value}</Badge>;
}
