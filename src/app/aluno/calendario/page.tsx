import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentEmptyState, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { studentEventTypeLabel } from "@/lib/student-labels";
import { cn, formatDate } from "@/lib/utils";
import { getStudentPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

const filters = [
  { href: "/aluno/calendario", label: "Todos", value: "" },
  { href: "/aluno/calendario?tipo=provas", label: "Provas", value: "provas", eventType: "PROVA" },
  { href: "/aluno/calendario?tipo=atividades", label: "Atividades", value: "atividades", eventType: "ATIVIDADE" },
  { href: "/aluno/calendario?tipo=eventos", label: "Eventos", value: "eventos", eventType: "EVENTO" },
  { href: "/aluno/calendario?tipo=reunioes", label: "Reuniões", value: "reunioes", eventType: "REUNIAO" },
  { href: "/aluno/calendario?tipo=feriados", label: "Feriados", value: "feriados", eventType: "FERIADO" }
];

export default async function StudentCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo = "" } = await searchParams;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const selectedFilter = filters.find((filter) => filter.value === tipo);
  const events = portal.events.filter((event) => !selectedFilter?.eventType || event.type === selectedFilter.eventType);
  const highlighted = portal.events.filter((event) => ["PROVA", "ATIVIDADE", "PRAZO"].includes(event.type)).slice(0, 4);

  return (
    <main className="page-shell">
      <StudentPageHeader
        title="Calendário"
        description="Agenda escolar, provas, atividades e próximos compromissos."
        eyebrow={portal.enrollment?.classroom.name}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground ring-1 ring-slate-200 hover:bg-white hover:text-foreground",
              tipo === filter.value && "bg-white text-primary ring-primary/25"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <StudentSection title="Próximos compromissos">
          {highlighted.length ? (
            <div className="divide-y">
              {highlighted.map((event) => (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{studentEventTypeLabel(event.type)}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-950">{event.title}</p>
                  {event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Sem compromissos acadêmicos" />
          )}
        </StudentSection>

        <StudentSection title="Agenda">
          {events.length ? (
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[120px_1fr]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {formatDate(event.startsAt)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{event.title}</h2>
                      <Badge variant="info">{studentEventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(event.startsAt)}
                    </p>
                    {event.description ? <p className="mt-2 text-sm text-muted-foreground">{event.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum evento encontrado" description="Tente outro filtro de calendário." />
          )}
        </StudentSection>
      </section>
    </main>
  );
}
