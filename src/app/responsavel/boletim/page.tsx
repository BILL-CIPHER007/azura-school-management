import { BookOpenCheck, ClipboardCheck, GraduationCap, NotebookTabs } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianMetric, GuardianPageHeader, GuardianSection, GuardianStatusBadge } from "@/components/guardian/guardian-ui";
import { requireSession } from "@/lib/auth";
import { isPassingVisibleGrade } from "@/lib/academic-rules";
import { buildGradeRows } from "@/lib/student-academics";
import { guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { formatPercent } from "@/lib/utils";
import { getGuardianPortal, summarizeEnrollment } from "@/services/school-data";
import { GuardianReportFilters } from "./guardian-report-filters";

export const dynamic = "force-dynamic";

export default async function GuardianReportPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string; ano?: string; periodo?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const now = new Date();
  const academicYearEnded = portal.enrollment ? portal.enrollment.academicYear.endsAt < now : false;
  const summary = summarizeEnrollment(portal.enrollment, { isFinal: academicYearEnded });
  const allGrades = portal.enrollment?.grades ?? [];
  const years = [
    ...new Set(
      allGrades.flatMap((grade) =>
        grade.academicPeriod.academicYear?.year ? [String(grade.academicPeriod.academicYear.year)] : []
      )
    )
  ];
  const selectedYear = query.ano && years.includes(query.ano) ? query.ano : years[0] ?? "";
  const periods = [
    ...new Map(
      allGrades
        .filter((grade) => !selectedYear || String(grade.academicPeriod.academicYear?.year) === selectedYear)
        .map((grade) => [grade.academicPeriod.id, grade.academicPeriod] as const)
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    ).values()
  ];
  const requestedPeriod = query.periodo ?? "todos";
  const selectedPeriod =
    requestedPeriod === "todos" || periods.some((period) => period.id === requestedPeriod) ? requestedPeriod : "todos";
  const visiblePeriods =
    selectedPeriod === "todos" ? periods : periods.filter((period) => period.id === selectedPeriod);
  const filteredGrades = allGrades.filter((grade) => {
    const byYear = !selectedYear || String(grade.academicPeriod.academicYear?.year) === selectedYear;
    const byPeriod = selectedPeriod === "todos" || grade.academicPeriod.id === selectedPeriod;
    return byYear && byPeriod;
  });
  const selectedContextEnded =
    selectedPeriod === "todos" ? academicYearEnded : visiblePeriods.length > 0 && visiblePeriods.every((period) => period.endsAt < now);
  const rows = buildGradeRows(filteredGrades, summary.attendanceRate, { isFinal: selectedContextEnded });
  const classroom = portal.enrollment?.classroom;

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Boletim"
          description={`Notas e situação acadêmica de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Média geral" value={summary.averageGrade.toFixed(1)} icon={NotebookTabs} tone="primary" />
        <GuardianMetric label="Frequência" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} tone="success" />
        <GuardianMetric label="Disciplinas" value={summary.subjectAverages.length} icon={BookOpenCheck} tone="info" />
        <GuardianMetric
          label="Situação"
          value={summary.situation}
          icon={GraduationCap}
          tone={summary.situation === "Aprovado" || summary.situation === "Cursando" ? "success" : "warning"}
          valueClassName="overflow-visible whitespace-normal text-2xl leading-tight text-clip"
        />
      </section>

      <GuardianSection title="Filtros" description="Consulte o boletim por ano letivo e período.">
        <GuardianReportFilters
          studentId={portal.selectedStudent?.id}
          years={years}
          periods={periods.map((period) => ({ id: period.id, name: period.name }))}
          selectedYear={selectedYear}
          selectedPeriod={selectedPeriod}
        />
      </GuardianSection>

      <GuardianSection title="Tabela do boletim" className="overflow-hidden" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="guardian-table">
            <thead>
              <tr>
                <th>Disciplina</th>
                {visiblePeriods.map((period) => (
                  <th key={period.id}>{period.name}</th>
                ))}
                <th>Média</th>
                <th>Frequência</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subject.id}>
                  <td className="font-semibold text-school-navy">{row.subject.name}</td>
                  {visiblePeriods.map((period) => {
                    const grade = row.values.find((item) => item.periodId === period.id)?.value;
                    return <td key={period.id}>{grade === null || grade === undefined ? "-" : grade.toFixed(1)}</td>;
                  })}
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <strong className={isPassingVisibleGrade(row.average) ? "text-school-navy" : "text-warning"}>
                        {row.average.toFixed(1)}
                      </strong>
                      {!isPassingVisibleGrade(row.average) ? <Badge variant="warning">Abaixo da média</Badge> : null}
                    </span>
                  </td>
                  <td>{formatPercent(row.attendanceRate)}</td>
                  <td>
                    <GuardianStatusBadge value={row.situation} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={visiblePeriods.length + 4}>
                    <div className="py-8 text-center text-sm text-text-secondary">Nenhuma nota encontrada para os filtros selecionados.</div>
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
