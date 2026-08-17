import Link from "next/link";
import { AlertTriangle, CalendarPlus, ClipboardCheck, GraduationCap, Megaphone, School, Users } from "lucide-react";
import { AdminMetric, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { schoolConfig } from "@/config/school";
import { audienceLabel, shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/utils";
import { getAdminAttentionStudents, getAdminDashboard } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireSession(["ADMIN"]);
  const [dashboard, attentionStudents] = await Promise.all([
    getAdminDashboard(session.schoolId),
    getAdminAttentionStudents(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Dashboard administrativo"
        description="Visão operacional da escola, matrículas, turmas e pontos de atenção."
        action={
          <>
            <Button asChild>
              <Link href="/admin/matriculas/nova">
                <ClipboardCheck className="h-4 w-4" />
                Nova matrícula
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/comunicados">
                <Megaphone className="h-4 w-4" />
                Novo comunicado
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetric label="Alunos ativos" value={dashboard.metrics.students} detail="na base" icon={GraduationCap} />
        <AdminMetric label="Matrículas ativas" value={dashboard.metrics.activeEnrollments} detail="ano letivo" icon={ClipboardCheck} />
        <AdminMetric label="Turmas" value={dashboard.metrics.classrooms} detail="organizadas" icon={School} />
        <AdminMetric label="Professores" value={dashboard.metrics.teachers} detail="equipe ativa" icon={Users} />
        <AdminMetric
          label="Frequência média"
          value={formatPercent(dashboard.metrics.attendanceAverage)}
          detail="presenças"
          tone="success"
        />
        <AdminMetric
          label="Em atenção"
          value={dashboard.metrics.belowExpected}
          detail={`abaixo de ${schoolConfig.academic.minimumAttendance}%`}
          tone={dashboard.metrics.belowExpected ? "warning" : "success"}
          icon={AlertTriangle}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSection title="Resumo das turmas" description="Desempenho e frequência por turma.">
          <div className="grid gap-3">
            {dashboard.classroomSummaries.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/admin/turmas/${classroom.id}`}
                className="rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{classroom.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {classroom.gradeLevel} · {shiftLabel(classroom.shift)} · {classroom.students} alunos
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
          </div>
        </AdminSection>

        <div className="grid gap-4">
          <AdminSection
            title="Ações rápidas"
            description="Atalhos para os fluxos administrativos principais."
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/matriculas/nova">Nova matrícula</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/matriculas/nova">Novo aluno</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/comunicados">Novo comunicado</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/calendario">
                  <CalendarPlus className="h-4 w-4" />
                  Novo evento
                </Link>
              </Button>
            </div>
          </AdminSection>

          <AdminSection title="Atenções" description="Alunos que exigem acompanhamento.">
            <div className="space-y-3">
              {attentionStudents.length ? (
                attentionStudents.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/alunos/${item.studentId}`}
                    className="block rounded-md border p-3 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{item.studentName}</strong>
                      <Badge variant="warning">{item.reasons[0]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.classroomName} · média {item.averageGrade.toFixed(1)} · frequência{" "}
                      {formatPercent(item.attendanceRate)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum aluno em atenção no momento.</p>
              )}
            </div>
          </AdminSection>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="Matrículas recentes">
          <div className="space-y-3">
            {dashboard.recentEnrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/admin/alunos/${enrollment.studentId}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <strong className="text-sm">{enrollment.student.fullName}</strong>
                <p className="text-xs text-muted-foreground">
                  {enrollment.registration} · {enrollment.classroom.name} · {formatDate(enrollment.enrolledAt)}
                </p>
              </Link>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Próximos eventos">
          <div className="space-y-3">
            {dashboard.events.map((event) => (
              <Link key={event.id} href="/admin/calendario" className="block rounded-md border p-3 hover:bg-muted">
                <strong className="text-sm">{event.title}</strong>
                <p className="text-xs text-muted-foreground">{formatDate(event.startsAt)}</p>
              </Link>
            ))}
          </div>
        </AdminSection>
      </section>

      <AdminSection title="Comunicados recentes">
        <div className="grid gap-3 md:grid-cols-3">
          {dashboard.announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-lg border p-4">
              <Badge>{audienceLabel(announcement.audience)}</Badge>
              <h3 className="mt-3 font-semibold">{announcement.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{announcement.content}</p>
            </article>
          ))}
        </div>
      </AdminSection>
    </main>
  );
}
