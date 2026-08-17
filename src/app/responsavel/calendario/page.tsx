import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { requireSession } from "@/lib/auth";
import { guardianEventTypeLabel, guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
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

export default async function GuardianCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string; tipo?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const selectedFilter = filters.find((filter) => filter.value === (query.tipo ?? ""));
  const events = portal.events.filter((event) => !selectedFilter?.eventType || event.type === selectedFilter.eventType);
  const highlighted = portal.events.filter((event) => ["REUNIAO", "PROVA", "PRAZO", "EVENTO"].includes(event.type)).slice(0, 4);
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
    <main className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground ring-1 ring-slate-200 hover:bg-white hover:text-foreground",
              (query.tipo ?? "") === filter.value && "bg-white text-primary ring-primary/25"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <GuardianSection title="Próximos eventos">
          {highlighted.length ? (
            <div className="divide-y">
              {highlighted.map((event) => (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-950">{event.title}</p>
                  {event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Sem compromissos próximos" />
          )}
        </GuardianSection>

        <GuardianSection title="Agenda">
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
                      <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(event.startsAt)}
                    </p>
                    {event.description ? <p className="mt-2 text-sm text-muted-foreground">{event.description}</p> : null}
                    {classroom ? <p className="mt-2 text-xs text-muted-foreground">{classroom.name} · {portal.selectedStudent?.fullName}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum evento encontrado" description="Tente outro filtro de calendário." />
          )}
        </GuardianSection>
      </section>
    </main>
  );
}
