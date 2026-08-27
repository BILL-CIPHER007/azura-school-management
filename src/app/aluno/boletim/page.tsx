import { BookOpenCheck, ClipboardCheck, GraduationCap, NotebookTabs } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentMetric, StudentPageHeader, StudentSection, StudentStatusBadge } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { isPassingVisibleGrade } from "@/lib/academic-rules";
import { buildGradeRows } from "@/lib/student-academics";
import { formatPercent } from "@/lib/utils";
import { getStudentPortal, summarizeEnrollment } from "@/services/school-data";
import { StudentReportFilters } from "./student-report-filters";

export const dynamic = "force-dynamic";

export default async function StudentReportPage({
  searchParams
}: {
  searchParams: Promise<{ ano?: string; periodo?: string }>;
}) {
  const filters = await searchParams;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const academicYearEnded = portal.enrollment ? Boolean(portal.enrollment.academicYear.closedAt) : false;
  const summary = summarizeEnrollment(portal.enrollment, { isFinal: academicYearEnded });
  const allGrades = portal.enrollment?.grades ?? [];
  const years = [
    ...new Set(
      allGrades.flatMap((grade) =>
        grade.academicPeriod.academicYear?.year ? [String(grade.academicPeriod.academicYear.year)] : []
      )
    )
  ];
  const selectedYear = filters.ano && years.includes(filters.ano) ? filters.ano : years[0] ?? "";
  const periods = [
    ...new Map(
      allGrades
        .filter((grade) => !selectedYear || String(grade.academicPeriod.academicYear?.year) === selectedYear)
        .map((grade) => [grade.academicPeriod.id, grade.academicPeriod] as const)
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    ).values()
  ];
  const requestedPeriod = filters.periodo ?? "todos";
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
    selectedPeriod === "todos" ? academicYearEnded : visiblePeriods.length > 0 && visiblePeriods.every((period) => period.closedAt);
  const gradeRows = buildGradeRows(filteredGrades, summary.attendanceRate, { isFinal: selectedContextEnded });

  return (
    <main className="student-page">
      <StudentPageHeader
        title="Boletim"
        description="Notas, médias, frequência e situação acadêmica organizadas por disciplina."
        eyebrow={portal.enrollment?.classroom.name}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric label="Média geral" value={summary.averageGrade.toFixed(1)} icon={NotebookTabs} tone="primary" />
        <StudentMetric label="Frequência geral" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} tone="success" />
        <StudentMetric label="Disciplinas" value={summary.subjectAverages.length} icon={BookOpenCheck} tone="info" />
        <StudentMetric
          label="Situação"
          value={summary.situation}
          icon={GraduationCap}
          tone={summary.situation === "Aprovado" || summary.situation === "Cursando" ? "success" : "warning"}
          valueClassName="overflow-visible whitespace-normal text-2xl leading-tight text-clip"
        />
      </section>

      <StudentSection title="Filtros" description="Escolha o ano e o período para consultar o boletim.">
        <StudentReportFilters
          years={years}
          periods={periods.map((period) => ({ id: period.id, name: period.name }))}
          selectedYear={selectedYear}
          selectedPeriod={selectedPeriod}
        />
      </StudentSection>

      <StudentSection title="Tabela do boletim" className="overflow-hidden" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="student-table">
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
              {gradeRows.map((row) => (
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
                    <StudentStatusBadge value={row.situation} />
                  </td>
                </tr>
              ))}
              {!gradeRows.length ? (
                <tr>
                  <td colSpan={visiblePeriods.length + 4}>
                    <div className="py-8 text-center text-sm text-text-secondary">Nenhuma nota encontrada para os filtros selecionados.</div>
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
