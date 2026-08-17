import { BookOpenCheck, ClipboardCheck, FileWarning, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ProgressBar } from "@/components/dashboard";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { requireSession } from "@/lib/auth";
import { summarizeGuardianAttendance } from "@/lib/guardian-academics";
import { guardianAttendanceLabel, guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { formatDate, formatPercent } from "@/lib/utils";
import { getGuardianPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardianAttendancePage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string; disciplina?: string; status?: string; periodo?: string }>;
}) {
  const query = await searchParams;
  const selectedStatus =
    query.status === "presente"
      ? "PRESENT"
      : query.status === "ausente"
        ? "ABSENT"
        : query.status === "justificado"
          ? "JUSTIFIED"
          : null;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const attendances = portal.enrollment?.attendances ?? [];
  const summary = summarizeGuardianAttendance(attendances);
  const subjects = [
    ...new Map(attendances.map((attendance) => [attendance.subject.id, attendance.subject] as const)).values()
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const filteredAttendances = attendances.filter((attendance) => {
    const bySubject = !query.disciplina || query.disciplina === "todas" || attendance.subject.id === query.disciplina;
    const byStatus = !selectedStatus || attendance.status === selectedStatus;
    const now = new Date();
    const days = query.periodo === "30" ? 30 : query.periodo === "90" ? 90 : null;
    const byPeriod = !days || attendance.date >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return bySubject && byStatus && byPeriod;
  });
  const classroom = portal.enrollment?.classroom;

  return (
    <main className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GuardianPageHeader
          title="Frequência"
          description={`Presença e faltas de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Presença geral" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} />
        <GuardianMetric label="Faltas" value={summary.absences} alert={summary.absences > 0 ? "Ver histórico" : undefined} icon={FileWarning} />
        <GuardianMetric label="Justificadas" value={summary.justified} icon={BookOpenCheck} />
        <GuardianMetric label="Aulas registradas" value={summary.registered} icon={ListChecks} />
      </section>

      <GuardianSection title="Frequência por disciplina">
        <div className="grid gap-4 md:grid-cols-2">
          {summary.bySubject.map((subject) => (
            <div key={subject.subject.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-950">{subject.subject.name}</span>
                <strong>{formatPercent(subject.attendanceRate)}</strong>
              </div>
              <ProgressBar value={subject.attendanceRate} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {subject.absences ? `${subject.absences} faltas` : "Sem faltas"} · {subject.total} aulas
              </p>
            </div>
          ))}
          {!summary.bySubject.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma chamada registrada até o momento.</p>
          ) : null}
        </div>
      </GuardianSection>

      <GuardianSection title="Histórico de frequência">
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]" action="/responsavel/frequencia">
          {portal.selectedStudent ? <input type="hidden" name="studentId" value={portal.selectedStudent.id} /> : null}
          <Select name="disciplina" defaultValue={query.disciplina ?? "todas"}>
            <option value="todas">Todas as disciplinas</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </Select>
          <Select name="periodo" defaultValue={query.periodo ?? "todos"}>
            <option value="todos">Todo o período</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </Select>
          <Select name="status" defaultValue={query.status ?? "todos"}>
            <option value="todos">Todos os status</option>
            <option value="presente">Presente</option>
            <option value="ausente">Ausente</option>
            <option value="justificado">Justificado</option>
          </Select>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="sticky top-14 z-10">
              <tr>
                <th>Data</th>
                <th>Disciplina</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.map((attendance) => (
                <tr key={attendance.id}>
                  <td>{formatDate(attendance.date)}</td>
                  <td className="font-medium text-slate-950">{attendance.subject.name}</td>
                  <td>
                    <Badge variant={attendance.status === "PRESENT" ? "success" : attendance.status === "JUSTIFIED" ? "info" : "warning"}>
                      {guardianAttendanceLabel(attendance.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filteredAttendances.length ? (
                <tr>
                  <td colSpan={3}>
                    <div className="py-6 text-center text-sm text-muted-foreground">Nenhum registro encontrado para os filtros selecionados.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </GuardianSection>
    </main>
  );
}
