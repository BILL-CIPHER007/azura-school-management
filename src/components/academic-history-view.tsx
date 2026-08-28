import { Badge } from "@/components/ui/badge";
import type { AcademicHistoryData, AcademicHistoryEnrollment } from "@/lib/academic-history";
import { academicSituationTone, enrollmentStatusLabel, enrollmentStatusTone, shiftLabel } from "@/lib/admin-labels";
import { cn, formatDate, formatPercent } from "@/lib/utils";

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

function formatAttendance(value: number | null) {
  return value === null ? "-" : formatPercent(value);
}

function HistorySummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-normal text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-school-navy">{value}</p>
    </div>
  );
}

function EnrollmentHistoryCard({
  enrollment,
  tableClassName
}: {
  enrollment: AcademicHistoryEnrollment;
  tableClassName: string;
}) {
  const situationLabel = enrollment.isClosed ? "Situação final" : "Situação atual";
  const hasSubjects = enrollment.subjects.length > 0;
  const periodLabel = enrollment.periods.map((period) => period.name).join(", ");

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-school-navy">{enrollment.academicYear.year}</h2>
              <Badge variant={enrollment.isClosed ? "success" : "info"}>{enrollment.yearStateLabel}</Badge>
              <Badge variant={enrollmentStatusTone(enrollment.enrollmentStatus)}>
                {enrollmentStatusLabel(enrollment.enrollmentStatus)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {enrollment.classroom.name} · {enrollment.classroom.gradeLevel} · {shiftLabel(enrollment.classroom.shift)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Matrícula {enrollment.registration} · entrada em {formatDate(enrollment.enrolledAt)}
            </p>
          </div>
          {periodLabel ? (
            <p className="max-w-xl text-sm leading-6 text-text-secondary md:text-right">
              Períodos: {periodLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <HistorySummaryItem label="Média geral" value={formatAverage(enrollment.generalAverage)} />
          <HistorySummaryItem label="Frequência geral" value={formatAttendance(enrollment.overallAttendanceRate)} />
          <HistorySummaryItem label={situationLabel} value={enrollment.situation} />
        </div>

        {!enrollment.hasAcademicRecords ? (
          <div className="rounded-md border border-dashed border-border-strong bg-school-primary-soft/35 p-4 text-sm text-text-secondary">
            Ainda não há registros acadêmicos suficientes para este ano.
          </div>
        ) : null}

        {hasSubjects ? (
          <div className="overflow-x-auto">
            <table className={cn(tableClassName, "min-w-[720px]")}>
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Média consolidada</th>
                  <th>Frequência</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {enrollment.subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td className="font-semibold text-school-navy">{subject.name}</td>
                    <td>{formatAverage(subject.average)}</td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        {formatAttendance(subject.attendanceRate)}
                        {subject.attendanceTotal ? (
                          <span className="text-xs text-text-muted">({subject.attendanceTotal} registros)</span>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <Badge variant={subject.situation === "Sem nota" ? "neutral" : academicSituationTone(subject.situation)}>
                        {subject.situation}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border-strong bg-school-primary-soft/35 p-4 text-sm text-text-secondary">
            Nenhuma disciplina encontrada para esta matrícula.
          </div>
        )}
      </div>
    </section>
  );
}

export function AcademicHistoryView({
  history,
  tableClassName = "data-table"
}: {
  history: AcademicHistoryData;
  tableClassName?: string;
}) {
  if (!history.enrollments.length) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-school-primary-soft/50 p-8 text-center">
        <p className="font-semibold text-school-navy">Nenhuma matrícula encontrada</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-secondary">
          O histórico escolar aparecerá quando houver matrículas registradas para este aluno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.enrollments.map((enrollment) => (
        <EnrollmentHistoryCard key={enrollment.id} enrollment={enrollment} tableClassName={tableClassName} />
      ))}
    </div>
  );
}
