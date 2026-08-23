import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentEmptyState, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { compareCalendarEvents, formatEventTime } from "@/lib/calendar-events";
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

function DateBlock({ date }: { date: Date }) {
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");

  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-school-primary-soft text-school-navy">
      <strong className="text-2xl leading-none">{day}</strong>
      <span className="mt-1 text-[0.7rem] font-semibold uppercase leading-none">{month}</span>
    </div>
  );
}

export default async function StudentCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo = "" } = await searchParams;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const selectedFilter = filters.find((filter) => filter.value === tipo);
  const events = portal.events
    .filter((event) => !selectedFilter?.eventType || event.type === selectedFilter.eventType)
    .sort(compareCalendarEvents);
  const highlighted = events.slice(0, 3);

  return (
    <main className="student-page">
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
              "rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-school-primary-soft hover:text-school-primary",
              tipo === filter.value && "border-school-primary bg-school-primary text-white hover:bg-school-primary hover:text-white"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <StudentSection title="Próximos compromissos" description="Itens acadêmicos que merecem atenção.">
          {highlighted.length ? (
            <div className="divide-y divide-border">
              {highlighted.map((event) => (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{studentEventTypeLabel(event.type)}</Badge>
                    <span className="text-sm text-text-muted">{formatDate(event.startsAt)}</span>
                    {formatEventTime(event) ? <span className="text-sm text-text-muted">{formatEventTime(event)}</span> : null}
                  </div>
                  <p className="mt-2 font-semibold text-school-navy">{event.title}</p>
                  {event.description ? <p className="mt-1 text-sm leading-6 text-text-secondary">{event.description}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum compromisso encontrado" description="Não há eventos para o filtro selecionado." />
          )}
        </StudentSection>

        <StudentSection title="Agenda">
          {events.length ? (
            <div className="divide-y divide-border">
              {events.map((event) => (
                <div key={event.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <DateBlock date={event.startsAt} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-school-navy">{event.title}</h2>
                      <Badge variant="info">{studentEventTypeLabel(event.type)}</Badge>
                    </div>
                    {formatEventTime(event) ? (
                      <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                        <Clock className="h-3.5 w-3.5 text-school-primary" />
                        {formatEventTime(event)}
                      </p>
                    ) : null}
                    {event.description ? <p className="mt-2 text-sm leading-6 text-text-secondary">{event.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum compromisso encontrado" description="Não há eventos para o filtro selecionado." />
          )}
        </StudentSection>
      </section>
    </main>
  );
}
