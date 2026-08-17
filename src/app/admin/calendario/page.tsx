import { createCalendarEvent } from "@/app/actions/academic";
import { AdminPageHeader, AdminSection, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { schoolConfig } from "@/config/school";
import { eventTypeLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getEnrollmentOptions, listCalendarAdmin } from "@/services/school-data";

export const dynamic = "force-dynamic";

const eventFilters = [
  { label: "Todos", value: "" },
  { label: "Provas", value: "PROVA" },
  { label: "Reuniões", value: "REUNIAO" },
  { label: "Eventos", value: "EVENTO" },
  { label: "Feriados", value: "FERIADO" },
  { label: "Prazos", value: "PRAZO" }
];

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const [events, options] = await Promise.all([
    listCalendarAdmin(session.schoolId),
    getEnrollmentOptions(session.schoolId)
  ]);
  const filteredEvents = query.tipo ? events.filter((event) => event.type === query.tipo) : events;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Calendário escolar"
        description="Central de agenda com provas, reuniões, eventos, feriados e prazos."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Calendário" }]}
      />

      <AdminSection title="Novo evento" description="Publique eventos para o calendário escolar.">
        <form action={createCalendarEvent} className="grid gap-3">
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
      </AdminSection>

      <div className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2">
        {eventFilters.map((filter) => (
          <Button
            key={filter.label}
            asChild
            variant={query.tipo === filter.value || (!query.tipo && !filter.value) ? "default" : "outline"}
            size="sm"
          >
            <a href={filter.value ? `/admin/calendario?tipo=${filter.value}` : "/admin/calendario"}>
              {filter.label}
            </a>
          </Button>
        ))}
      </div>

      <AdminSection title="Eventos publicados" description="Lista cronológica da agenda escolar.">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Título</th>
                <th>Descrição</th>
                <th>Ano letivo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.startsAt)}</td>
                  <td>
                    <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                  </td>
                  <td className="font-medium">{event.title}</td>
                  <td>{event.description ?? "-"}</td>
                  <td>{event.academicYear.year}</td>
                  <td>
                    <RowActions items={[{ label: "Editar", disabled: true }, { label: "Excluir", disabled: true }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </main>
  );
}
