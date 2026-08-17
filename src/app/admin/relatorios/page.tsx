import { PageHeader, MetricCard } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { getAdminDashboard } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await requireSession(["ADMIN"]);
  const dashboard = await getAdminDashboard(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Relatórios" description="Indicadores acadêmicos essenciais do MVP." />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Matrículas ativas" value={dashboard.metrics.activeEnrollments} />
        <MetricCard label="Frequência média" value={formatPercent(dashboard.metrics.attendanceAverage)} />
        <MetricCard label="Alunos em atenção" value={dashboard.metrics.belowExpected} />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por turma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboard.classroomSummaries.map((classroom) => (
            <div key={classroom.id} className="grid gap-1 rounded-lg border p-4 md:grid-cols-4">
              <strong>{classroom.name}</strong>
              <span>{classroom.students} alunos</span>
              <span>Média {classroom.averageGrade.toFixed(1)}</span>
              <span>Frequência {formatPercent(classroom.attendance)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
