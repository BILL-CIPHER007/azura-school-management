import Link from "next/link";
import { PageHeader, MetricCard, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/utils";
import { getAdminDashboard } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireSession(["ADMIN"]);
  const dashboard = await getAdminDashboard(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader
        title="Dashboard administrativo"
        description="Visão geral acadêmica, matrículas e acompanhamento da escola."
        action={
          <Button asChild>
            <Link href="/admin/matriculas/nova">Novo aluno</Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Alunos" value={dashboard.metrics.students} detail="ativos na base" />
        <MetricCard label="Professores" value={dashboard.metrics.teachers} detail="equipe ativa" />
        <MetricCard label="Turmas" value={dashboard.metrics.classrooms} detail="ano letivo" />
        <MetricCard label="Matrículas" value={dashboard.metrics.activeEnrollments} detail="ativas" />
        <MetricCard
          label="Frequência média"
          value={formatPercent(dashboard.metrics.attendanceAverage)}
          detail="presenças registradas"
          tone="success"
        />
        <MetricCard
          label="Atenção"
          value={dashboard.metrics.belowExpected}
          detail={`abaixo de ${schoolConfig.academic.minimumAttendance}%`}
          tone={dashboard.metrics.belowExpected ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo das turmas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {dashboard.classroomSummaries.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/admin/turmas/${classroom.id}`}
                className="rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{classroom.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {classroom.gradeLevel} · {classroom.shift} · {classroom.students} alunos
                    </p>
                  </div>
                  <Badge variant="info">Média {classroom.averageGrade.toFixed(1)}</Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar value={classroom.attendance} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Frequência {formatPercent(classroom.attendance)}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Matrículas recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recentEnrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/admin/alunos/${enrollment.studentId}`}
                  className="block rounded-md border p-3 hover:bg-muted"
                >
                  <strong className="text-sm">{enrollment.student.fullName}</strong>
                  <p className="text-xs text-muted-foreground">
                    {enrollment.registration} · {enrollment.classroom.name}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.events.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <strong className="text-sm">{event.title}</strong>
                  <p className="text-xs text-muted-foreground">{formatDate(event.startsAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Comunicados recentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {dashboard.announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-lg border p-4">
              <Badge>{announcement.audience}</Badge>
              <h3 className="mt-3 font-semibold">{announcement.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{announcement.content}</p>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
