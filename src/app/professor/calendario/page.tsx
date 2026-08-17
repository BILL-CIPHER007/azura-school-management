import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TeacherPageHeader,
  TeacherSection
} from "@/components/teacher/teacher-ui";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { eventTypeLabel } from "@/lib/teacher-labels";
import { cn, formatDate } from "@/lib/utils";
import { listCalendarAdmin } from "@/services/school-data";

export const dynamic = "force-dynamic";

const filters = [
  { label: "Todos", value: "" },
  { label: "Provas", value: "PROVA" },
  { label: "Reuniões", value: "REUNIAO" },
  { label: "Eventos", value: "EVENTO" },
  { label: "Atividades", value: "ATIVIDADE" }
];

export default async function ProfessorCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requireSession(["PROFESSOR"]);
  const query = await searchParams;
  const events = await listCalendarAdmin(session.schoolId);
  const filteredEvents = query.tipo ? events.filter((event) => event.type === query.tipo) : events;
  const nextEvents = filteredEvents.slice(0, 6);
  const monthDays = Array.from({ length: 31 }, (_, index) => index + 1);
  const monthEvents = filteredEvents.filter((event) => event.startsAt.getMonth() === 7);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <TeacherPageHeader
        title="Calendário"
        description="Agenda escolar com provas, reuniões, eventos e atividades relevantes."
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.label}
            asChild
            variant={query.tipo === filter.value || (!query.tipo && !filter.value) ? "default" : "outline"}
            size="sm"
          >
            <Link href={filter.value ? `/professor/calendario?tipo=${filter.value}` : "/professor/calendario"}>
              {filter.label}
            </Link>
          </Button>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TeacherSection title={`Agosto de ${schoolConfig.academic.academicYear}`}>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200 text-sm">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <div key={day} className="bg-slate-50 px-2 py-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: 5 }, (_, index) => (
              <div key={`blank-${index}`} className="min-h-20 bg-white" />
            ))}
            {monthDays.map((day) => {
              const dayEvents = monthEvents.filter((event) => event.startsAt.getDate() === day);
              return (
                <div key={day} className="min-h-20 bg-white p-2">
                  <span className="text-xs font-medium text-muted-foreground">{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="truncate rounded bg-primary/10 px-1.5 py-1 text-xs text-primary">
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TeacherSection>

        <TeacherSection title="Próximos eventos">
          <div className="space-y-3">
            {nextEvents.map((event) => (
              <article key={event.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</p>
                    {event.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                    ) : null}
                    <p className={cn("mt-2 text-xs text-muted-foreground")}>
                      Ano letivo {event.academicYear.year}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            {!nextEvents.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado para o filtro selecionado.</p>
            ) : null}
          </div>
        </TeacherSection>
      </section>
    </main>
  );
}
