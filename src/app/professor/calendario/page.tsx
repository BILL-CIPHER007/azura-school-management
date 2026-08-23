import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeacherPageHeader } from "@/components/teacher/teacher-ui";
import { requireSession } from "@/lib/auth";
import { listCalendarAdmin } from "@/services/school-data";
import { ProfessorCalendarBoard } from "./professor-calendar-board";

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
  const calendarEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    startsAt: event.startsAt.toISOString(),
    startTime: event.startTime,
    endTime: event.endTime,
    academicYear: {
      year: event.academicYear.year
    }
  }));

  return (
    <main className="teacher-page">
      <TeacherPageHeader
        title="Calendário"
        description="Agenda escolar com provas, reuniões, eventos e atividades relevantes para o corpo docente."
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

      <ProfessorCalendarBoard events={calendarEvents} />
    </main>
  );
}
