import { BookOpenCheck, ClipboardCheck, GraduationCap, NotebookTabs } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StudentMetric, StudentPageHeader, StudentSection, StudentStatusBadge } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { buildGradeRows } from "@/lib/student-academics";
import { formatPercent } from "@/lib/utils";
import { getStudentPortal, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentReportPage({
  searchParams
}: {
  searchParams: Promise<{ ano?: string; periodo?: string }>;
}) {
  const filters = await searchParams;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const summary = summarizeEnrollment(portal.enrollment);
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
  const selectedPeriod = filters.periodo ?? "todos";
  const visiblePeriods =
    selectedPeriod === "todos" ? periods : periods.filter((period) => period.id === selectedPeriod);
  const filteredGrades = allGrades.filter((grade) => {
    const byYear = !selectedYear || String(grade.academicPeriod.academicYear?.year) === selectedYear;
    const byPeriod = selectedPeriod === "todos" || grade.academicPeriod.id === selectedPeriod;
    return byYear && byPeriod;
  });
  const gradeRows = buildGradeRows(filteredGrades, summary.attendanceRate);

  return (
    <main className="page-shell">
      <StudentPageHeader
        title="Boletim"
        description="Notas, médias, frequência e situação acadêmica."
        eyebrow={portal.enrollment?.classroom.name}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric label="Média geral" value={summary.averageGrade.toFixed(1)} icon={NotebookTabs} />
        <StudentMetric label="Frequência geral" value={formatPercent(summary.attendanceRate)} icon={ClipboardCheck} />
        <StudentMetric label="Disciplinas" value={summary.subjectAverages.length} icon={BookOpenCheck} />
        <StudentMetric label="Situação" value={summary.situation} icon={GraduationCap} />
      </section>

      <StudentSection title="Filtros">
        <form className="grid gap-3 sm:grid-cols-[180px_220px_auto]" action="/aluno/boletim">
          <Select name="ano" defaultValue={selectedYear}>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
          <Select name="periodo" defaultValue={selectedPeriod}>
            <option value="todos">Todos os bimestres</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Aplicar filtros</Button>
        </form>
      </StudentSection>

      <StudentSection title="Tabela do boletim" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="sticky top-14 z-10">
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
                  <td className="font-semibold text-slate-950">{row.subject.name}</td>
                  {visiblePeriods.map((period) => {
                    const grade = row.values.find((item) => item.periodId === period.id)?.value;
                    return <td key={period.id}>{grade === null || grade === undefined ? "-" : grade.toFixed(1)}</td>;
                  })}
                  <td className="font-semibold">{row.average.toFixed(1)}</td>
                  <td>{formatPercent(row.attendanceRate)}</td>
                  <td><StudentStatusBadge value={row.situation} /></td>
                </tr>
              ))}
              {!gradeRows.length ? (
                <tr>
                  <td colSpan={visiblePeriods.length + 4}>
                    <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma nota encontrada para os filtros selecionados.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="info">Cursando</Badge>
          <Badge variant="success">Aprovado</Badge>
          <Badge variant="warning">Recuperação</Badge>
          <Badge variant="danger">Reprovado</Badge>
        </div>
      </StudentSection>
    </main>
  );
}
