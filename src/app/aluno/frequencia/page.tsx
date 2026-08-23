import { BookOpenCheck, ClipboardCheck, FileWarning, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard";
import { StudentEmptyState, StudentMetric, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { isAttendanceBelowMinimum } from "@/lib/academic-rules";
import { summarizeAttendance } from "@/lib/student-academics";
import { studentAttendanceLabel } from "@/lib/student-labels";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import { getStudentPortal } from "@/services/school-data";
import { StudentAttendanceFilters } from "./student-attendance-filters";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage({
  searchParams
}: {
  searchParams: Promise<{ disciplina?: string; status?: string; periodo?: string }>;
}) {
  const filters = await searchParams;
  const selectedSubjectParam = filters.disciplina ?? "todas";
  const selectedPeriodFilter = filters.periodo === "30" || filters.periodo === "90" ? filters.periodo : "todos";
  const selectedStatusFilter =
    filters.status === "presente" || filters.status === "ausente" || filters.status === "justificado"
      ? filters.status
      : "todos";
  const selectedStatus =
    selectedStatusFilter === "presente"
      ? "PRESENT"
      : selectedStatusFilter === "ausente"
        ? "ABSENT"
        : selectedStatusFilter === "justificado"
          ? "JUSTIFIED"
          : null;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const attendances = portal.enrollment?.attendances ?? [];
  const summary = summarizeAttendance(attendances);
  const subjects = [
    ...new Map(attendances.map((attendance) => [attendance.subject.id, attendance.subject] as const)).values()
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const selectedSubjectFilter =
    selectedSubjectParam === "todas" || subjects.some((subject) => subject.id === selectedSubjectParam)
      ? selectedSubjectParam
      : "todas";
  const filteredAttendances = attendances.filter((attendance) => {
    const bySubject = selectedSubjectFilter === "todas" || attendance.subject.id === selectedSubjectFilter;
    const byStatus = !selectedStatus || attendance.status === selectedStatus;
    const now = new Date();
    const days = selectedPeriodFilter === "30" ? 30 : selectedPeriodFilter === "90" ? 90 : null;
    const byPeriod = !days || attendance.date >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return bySubject && byStatus && byPeriod;
  });

  return (
    <main className="student-page">
      <StudentPageHeader
        title="Frequência"
        description="Acompanhe presença geral, disciplina e histórico das chamadas registradas."
        eyebrow={portal.enrollment?.classroom.name}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric label="Presença geral" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} tone="success" />
        <StudentMetric label="Faltas" value={summary.absences} icon={FileWarning} tone={summary.absences > 0 ? "warning" : "success"} />
        <StudentMetric label="Justificadas" value={summary.justified} icon={BookOpenCheck} tone="info" />
        <StudentMetric label="Aulas registradas" value={summary.registered} icon={ListChecks} tone="primary" />
      </section>

      <StudentSection title="Frequência por disciplina" description="Percentual de presença consolidado por matéria.">
        {summary.bySubject.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {summary.bySubject.map((subject) => {
              const belowMinimum = isAttendanceBelowMinimum(subject.attendanceRate);
              return (
                <div
                  key={subject.subject.id}
                  className={cn(
                    "rounded-lg border border-border bg-surface-muted/60 p-4",
                    belowMinimum && "border-warning/30 bg-warning-soft/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-school-navy">{subject.subject.name}</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {belowMinimum ? <Badge variant="warning">Abaixo do mínimo</Badge> : null}
                      <strong className={belowMinimum ? "text-warning" : "text-school-navy"}>
                        {formatPercent(subject.attendanceRate)}
                      </strong>
                    </div>
                  </div>
                  <ProgressBar value={subject.attendanceRate} className="mt-3" />
                  <p className="mt-2 text-xs text-text-muted">{subject.total} aulas registradas</p>
                </div>
              );
            })}
          </div>
        ) : (
          <StudentEmptyState title="Nenhuma chamada registrada" description="Sua frequência por disciplina aparecerá aqui." />
        )}
      </StudentSection>

      <StudentSection title="Histórico de frequência" description="Use os filtros para localizar chamadas específicas.">
        <StudentAttendanceFilters
          subjects={subjects}
          selectedSubject={selectedSubjectFilter}
          selectedPeriod={selectedPeriodFilter}
          selectedStatus={selectedStatusFilter}
        />

        <div className="student-table-wrap">
          <table className="student-table">
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
                      {studentAttendanceLabel(attendance.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filteredAttendances.length ? (
                <tr>
                  <td colSpan={3}>
                    <div className="py-8 text-center text-sm text-text-secondary">
                      <strong className="block text-school-navy">Nenhum registro de frequência encontrado</strong>
                      <span className="mt-1 block">Tente ajustar os filtros selecionados.</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </StudentSection>
    </main>
  );
}
