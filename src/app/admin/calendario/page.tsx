import { createCalendarEvent } from "@/app/actions/academic";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { schoolConfig } from "@/config/school";
import { eventTypeLabel } from "@/lib/admin-labels";
import { formatEventDateTime } from "@/lib/calendar-events";
import { requireSession } from "@/lib/auth";
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

const errorMessages: Record<string, string> = {
  validacao: "Informe título, tipo, ano letivo e data válidos.",
  "termino-sem-inicio": "Informe o horário de início antes do horário de término.",
  horario: "O horário de término deve ser posterior ao horário de início."
};

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string; sucesso?: string; erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const [events, options] = await Promise.all([
    listCalendarAdmin(session.schoolId),
    getEnrollmentOptions(session.schoolId)
  ]);
  const filteredEvents = query.tipo ? events.filter((event) => event.type === query.tipo) : events;
  const successMessage = query.sucesso === "evento-criado" ? "Evento criado com sucesso." : null;
  const errorMessage = query.erro ? errorMessages[query.erro] ?? "Não foi possível criar o evento." : null;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Calendário escolar"
        description="Central de agenda com provas, reuniões, eventos, feriados e prazos."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Calendário" }]}
      />

      <AdminSection title="Novo evento" description="Publique eventos para o calendário escolar.">
        <form action={createCalendarEvent} className="grid gap-3">
          {successMessage || errorMessage ? (
            <div
              className={
                successMessage
                  ? "rounded-md border border-success/20 bg-success-soft px-3 py-2 text-sm font-medium text-success"
                  : "rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              }
            >
              {successMessage ?? errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
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
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_140px_140px]">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-text-muted">Data do evento</span>
              <Input name="startsAt" type="date" required defaultValue={schoolConfig.academic.defaultCalendarEventDate} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-text-muted">Início</span>
              <Input name="startTime" type="time" aria-label="Horário de início" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-text-muted">Término</span>
              <Input name="endTime" type="time" aria-label="Horário de término" />
            </label>
          </div>

          <Textarea name="description" placeholder="Descrição" />
          <Button type="submit" className="w-fit">
            Criar evento
          </Button>
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
                <th>Data e horário</th>
                <th>Tipo</th>
                <th>Título</th>
                <th>Descrição</th>
                <th>Ano letivo</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatEventDateTime(event, { allDayLabel: true })}</td>
                  <td>
                    <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                  </td>
                  <td className="font-medium">{event.title}</td>
                  <td>{event.description ?? "-"}</td>
                  <td>{event.academicYear.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredEvents.length ? (
          <div className="p-4">
            <AdminEmptyState
              title={events.length ? "Nenhum evento encontrado" : "Nenhum evento publicado"}
              description={events.length ? "Não há eventos para o filtro selecionado." : "Crie o primeiro evento para iniciar a agenda escolar."}
            />
          </div>
        ) : null}
      </AdminSection>
    </main>
  );
}
