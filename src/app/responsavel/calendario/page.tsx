import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { requireSession } from "@/lib/auth";
import { guardianEventTypeLabel, guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { compareCalendarEvents, formatEventTime } from "@/lib/calendar-events";
import { cn, formatDate } from "@/lib/utils";
import { getGuardianPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

const filters = [
  { label: "Todos", value: "" },
  { label: "Reuniões", value: "reunioes", eventType: "REUNIAO" },
  { label: "Provas", value: "provas", eventType: "PROVA" },
  { label: "Eventos", value: "eventos", eventType: "EVENTO" },
  { label: "Entrega de boletins", value: "boletins", eventType: "PRAZO" },
  { label: "Prazos", value: "prazos", eventType: "PRAZO" }
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

export default async function GuardianCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string; tipo?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const selectedFilter = filters.find((filter) => filter.value === (query.tipo ?? ""));
  const events = portal.events
    .filter((event) => !selectedFilter?.eventType || event.type === selectedFilter.eventType)
    .sort(compareCalendarEvents);
  const highlighted = events.slice(0, 3);
  const studentId = portal.selectedStudent?.id;
  const classroom = portal.enrollment?.classroom;

  function filterHref(value: string) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (value) params.set("tipo", value);
    const qs = params.toString();
    return qs ? `/responsavel/calendario?${qs}` : "/responsavel/calendario";
  }

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Calendário"
          description={`Agenda escolar relevante para ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.label}
            href={filterHref(filter.value)}
            className={cn(
              "rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-school-primary-soft hover:text-school-primary",
              (query.tipo ?? "") === filter.value && "border-school-primary bg-school-primary text-white hover:bg-school-primary hover:text-white"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <GuardianSection title="Próximos eventos" description="Reuniões, provas e prazos mais próximos.">
          {highlighted.length ? (
            <div className="divide-y divide-border">
              {highlighted.map((event) => (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
                    <span className="text-sm text-text-muted">{formatDate(event.startsAt)}</span>
                    {formatEventTime(event) ? <span className="text-sm text-text-muted">{formatEventTime(event)}</span> : null}
                  </div>
                  <p className="mt-2 font-semibold text-school-navy">{event.title}</p>
                  {event.description ? <p className="mt-1 text-sm leading-6 text-text-secondary">{event.description}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum evento encontrado" description="Não há compromissos para o filtro selecionado." />
          )}
        </GuardianSection>

        <GuardianSection title="Agenda">
          {events.length ? (
            <div className="divide-y divide-border">
              {events.map((event) => (
                <div key={event.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <DateBlock date={event.startsAt} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-school-navy">{event.title}</h2>
                      <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
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
            <GuardianEmptyState title="Nenhum evento encontrado" description="Não há compromissos para o filtro selecionado." />
          )}
        </GuardianSection>
      </section>
    </main>
  );
}
