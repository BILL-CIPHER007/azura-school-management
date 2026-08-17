import { createCalendarEvent } from "@/app/actions/academic";
import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getEnrollmentOptions, listCalendarAdmin } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await requireSession(["ADMIN"]);
  const [events, options] = await Promise.all([
    listCalendarAdmin(session.schoolId),
    getEnrollmentOptions(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <PageHeader title="Calendário escolar" description="Eventos, provas, reuniões, feriados e prazos." />
      <form action={createCalendarEvent} className="grid gap-3 rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
          <Input name="title" placeholder="Título do evento" required />
          <Select name="type" defaultValue="EVENTO">
            <option value="PROVA">Prova</option>
            <option value="REUNIAO">Reunião</option>
            <option value="EVENTO">Evento</option>
            <option value="FERIADO">Feriado</option>
            <option value="ATIVIDADE">Atividade</option>
            <option value="PRAZO">Prazo</option>
          </Select>
          <Select name="academicYearId" defaultValue={options.academicYears[0]?.id}>
            {options.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </Select>
          <Input name="startsAt" type="date" required defaultValue={schoolConfig.academic.defaultCalendarEventDate} />
        </div>
        <Textarea name="description" placeholder="Descrição" />
        <Button type="submit" className="w-fit">Criar evento</Button>
      </form>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <Badge variant="info">{event.type}</Badge>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{event.description}</p>
              <p className="mt-3">{formatDate(event.startsAt)} · {event.academicYear.year}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
