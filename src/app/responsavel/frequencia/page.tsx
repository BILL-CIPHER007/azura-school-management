import { BookOpenCheck, ClipboardCheck, FileWarning, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { requireSession } from "@/lib/auth";
import { isAttendanceBelowMinimum } from "@/lib/academic-rules";
import { summarizeGuardianAttendance } from "@/lib/guardian-academics";
import { guardianAttendanceLabel, guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { formatDate, formatPercent } from "@/lib/utils";
import { getGuardianPortal } from "@/services/school-data";
import { GuardianAttendanceFilters } from "./guardian-attendance-filters";

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
  const selectedSubject = query.disciplina ?? "todas";
  const selectedPeriod = query.periodo ?? "todos";
  const selectedStatusSlug = query.status ?? "todos";
  const subjects = [
    ...new Map(attendances.map((attendance) => [attendance.subject.id, attendance.subject] as const)).values()
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const filteredAttendances = attendances
    .filter((attendance) => {
      const bySubject = selectedSubject === "todas" || attendance.subject.id === selectedSubject;
      const byStatus = !selectedStatus || attendance.status === selectedStatus;
      const now = new Date();
      const days = selectedPeriod === "30" ? 30 : selectedPeriod === "90" ? 90 : null;
      const byPeriod = !days || attendance.date >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return bySubject && byStatus && byPeriod;
    })
    .sort((first, second) => second.date.getTime() - first.date.getTime());
  const classroom = portal.enrollment?.classroom;
  const studentId = portal.selectedStudent?.id;
  const attendanceHistoryHref = studentId
    ? `/responsavel/frequencia?studentId=${encodeURIComponent(studentId)}&status=ausente#historico`
    : "/responsavel/frequencia?status=ausente#historico";

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Frequência"
          description={`Presença e faltas de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Presença geral" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} tone="success" />
        <GuardianMetric
          label="Faltas"
          value={summary.absences}
          alert={summary.absences > 0 ? "Ver histórico" : undefined}
          alertHref={summary.absences > 0 ? attendanceHistoryHref : undefined}
          icon={FileWarning}
          tone={summary.absences > 0 ? "warning" : "success"}
        />
        <GuardianMetric label="Justificadas" value={summary.justified} icon={BookOpenCheck} tone="info" />
        <GuardianMetric label="Aulas registradas" value={summary.registered} icon={ListChecks} tone="primary" />
      </section>

      <GuardianSection title="Frequência por disciplina" description="Disciplinas com menor presença aparecem primeiro.">
        {summary.bySubject.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {summary.bySubject.map((subject) => {
              const lowAttendance = subject.attendanceRate > 0 && isAttendanceBelowMinimum(subject.attendanceRate);
              return (
                <div
                  key={subject.subject.id}
                  className={`rounded-lg border bg-surface-muted/60 p-4 ${
                    lowAttendance ? "border-warning/30 bg-warning-soft/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-school-navy">{subject.subject.name}</span>
                    <strong className={lowAttendance ? "text-warning" : "text-school-navy"}>{formatPercent(subject.attendanceRate)}</strong>
                  </div>
                  <ProgressBar value={subject.attendanceRate} className="mt-3" />
                  <p className="mt-2 text-xs text-text-muted">
                    {subject.absences ? `${subject.absences} faltas` : "Sem faltas"} · {subject.total} aulas
                  </p>
                  {lowAttendance ? <Badge variant="warning" className="mt-3">Abaixo do mínimo</Badge> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <GuardianEmptyState title="Nenhuma chamada registrada" description="A frequência por disciplina aparecerá aqui." />
        )}
      </GuardianSection>

      <div id="historico" className="scroll-mt-24">
        <GuardianSection title="Histórico de frequência" description="Filtre por disciplina, período ou status.">
          <GuardianAttendanceFilters
            studentId={studentId}
            subjects={subjects}
            selectedSubject={selectedSubject}
            selectedPeriod={selectedPeriod}
            selectedStatus={selectedStatusSlug}
          />

          <div className="guardian-table-wrap">
            <table className="guardian-table">
              <thead>
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
                    <td className="font-medium text-school-navy">{attendance.subject.name}</td>
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
                      <div className="py-8 text-center text-sm text-text-secondary">
                        <p className="font-semibold text-school-navy">Nenhum registro de frequência encontrado</p>
                        <p className="mt-1">Tente ajustar os filtros selecionados.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </GuardianSection>
      </div>
    </main>
  );
}
