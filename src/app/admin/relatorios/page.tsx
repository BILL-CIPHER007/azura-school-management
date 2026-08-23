import Link from "next/link";
import { AdminReportFilters } from "@/app/admin/relatorios/admin-report-filters";
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { academicSituationTone, shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { getAdminReports } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ ano?: string; turma?: string; periodo?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const report = await getAdminReports(session.schoolId, {
    academicYearId: query.ano,
    classroomId: query.turma,
    periodId: query.periodo
  });

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Relatórios"
        description="Indicadores acadêmicos essenciais para acompanhamento da secretaria."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Relatórios" }]}
      />

      <AdminToolbar>
        <AdminReportFilters
          academicYears={report.options.academicYears}
          classrooms={report.options.classrooms}
          selectedAcademicYear={report.filters.academicYearId}
          selectedClassroom={report.filters.classroomId}
          selectedPeriod={report.filters.periodId}
        />
      </AdminToolbar>

      <section className="grid gap-3 md:grid-cols-3">
        <AdminMetric
          label="Matrículas ativas"
          value={report.metrics.activeEnrollments}
          detail="alunos matriculados"
        />
        <AdminMetric
          label="Frequência média"
          value={formatPercent(report.metrics.attendanceAverage)}
          detail="presenças registradas"
        />
        <AdminMetric
          label="Alunos em atenção"
          value={report.metrics.attentionStudents}
          detail={report.metrics.attentionStudents ? "baixa frequência ou desempenho" : "nenhum indicador crítico"}
          tone={report.metrics.attentionStudents ? "warning" : "success"}
        />
      </section>

      <AdminSection title="Desempenho por turma">
        {report.hasData ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Alunos</th>
                  <th>Média</th>
                  <th>Frequência</th>
                  <th>Alunos em atenção</th>
                </tr>
              </thead>
              <tbody>
                {report.classroomSummaries.map((classroom) => (
                  <tr key={classroom.id}>
                    <td>
                      <Link href={`/admin/turmas/${classroom.id}`} className="font-medium text-primary">
                        {classroom.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {classroom.gradeLevel} · {shiftLabel(classroom.shift)}
                      </span>
                    </td>
                    <td>{classroom.students}</td>
                    <td>{classroom.averageGrade.toFixed(1)}</td>
                    <td>
                      <div className="w-40">
                        <ProgressBar value={classroom.attendance} />
                        <span className="text-xs text-muted-foreground">{formatPercent(classroom.attendance)}</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={classroom.attentionCount ? "warning" : "success"}>
                        {classroom.attentionCount}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminEmptyState
              title="Nenhum dado encontrado"
              description="Não há informações acadêmicas para os filtros selecionados."
            />
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Alunos em atenção"
        description="Baixa frequência ou desempenho abaixo do esperado."
      >
        {report.attentionStudents.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {report.attentionStudents.map((item) => (
              <Link key={item.id} href={`/admin/alunos/${item.studentId}`} className="rounded-lg border p-4 hover:bg-muted">
                <div className="flex items-center justify-between gap-3">
                  <strong>{item.studentName}</strong>
                  <Badge variant={academicSituationTone(item.situation)}>{item.situation}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.classroomName} · média {item.averageGrade.toFixed(1)} · frequência{" "}
                  {formatPercent(item.attendanceRate)}
                </p>
                <p className="mt-2 text-sm">{item.reasons.join(" · ")}</p>
              </Link>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Nenhum aluno em atenção"
            description="Não há alunos com indicadores de atenção no contexto selecionado."
          />
        )}
      </AdminSection>
    </main>
  );
}
