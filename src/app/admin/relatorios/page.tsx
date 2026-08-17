import Link from "next/link";
import { AdminMetric, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { schoolConfig } from "@/config/school";
import { academicSituationTone, shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { getAdminAttentionStudents, getAdminDashboard, getEnrollmentOptions } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await requireSession(["ADMIN"]);
  const [dashboard, attentionStudents, options] = await Promise.all([
    getAdminDashboard(session.schoolId),
    getAdminAttentionStudents(session.schoolId),
    getEnrollmentOptions(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Relatórios"
        description="Indicadores acadêmicos essenciais para acompanhamento da secretaria."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Relatórios" }]}
        action={
          <>
            <Button variant="outline" disabled>Exportar PDF</Button>
            <Button variant="outline" disabled>Exportar CSV</Button>
          </>
        }
      />

      <AdminToolbar>
        <form className="grid gap-3 md:grid-cols-[180px_220px_220px_auto]">
          <Select name="ano" defaultValue="">
            <option value="">Ano letivo</option>
            {options.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </Select>
          <Select name="turma" defaultValue="">
            <option value="">Todas as turmas</option>
            {options.classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </Select>
          <Select name="periodo" defaultValue="">
            <option value="">Período</option>
            {schoolConfig.academic.periodNames.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Aplicar filtros</Button>
        </form>
      </AdminToolbar>

      <section className="grid gap-3 md:grid-cols-3">
        <AdminMetric label="Matrículas ativas" value={dashboard.metrics.activeEnrollments} detail="alunos matriculados" />
        <AdminMetric label="Frequência média" value={formatPercent(dashboard.metrics.attendanceAverage)} detail="presenças registradas" />
        <AdminMetric label="Alunos em atenção" value={attentionStudents.length} detail="frequência ou desempenho" tone={attentionStudents.length ? "warning" : "success"} />
      </section>

      <AdminSection title="Desempenho por turma">
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
              {dashboard.classroomSummaries.map((classroom) => {
                const attentionCount = attentionStudents.filter((item) => item.classroomName === classroom.name).length;
                return (
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
                      <Badge variant={attentionCount ? "warning" : "success"}>{attentionCount}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="Alunos em atenção" description="Baixa frequência, recuperação ou risco acadêmico.">
        <div className="grid gap-3 md:grid-cols-2">
          {attentionStudents.map((item) => (
            <Link key={item.id} href={`/admin/alunos/${item.studentId}`} className="rounded-lg border p-4 hover:bg-muted">
              <div className="flex items-center justify-between gap-3">
                <strong>{item.studentName}</strong>
                <Badge variant={academicSituationTone(item.situation)}>{item.situation}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.classroomName} · média {item.averageGrade.toFixed(1)} · frequência {formatPercent(item.attendanceRate)}
              </p>
              <p className="mt-2 text-sm">{item.reasons.join(", ")}</p>
            </Link>
          ))}
          {!attentionStudents.length ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno em atenção nos dados atuais.</p>
          ) : null}
        </div>
      </AdminSection>
    </main>
  );
}
