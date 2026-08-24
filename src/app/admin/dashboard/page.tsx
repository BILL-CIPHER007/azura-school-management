import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  School,
  Users
} from "lucide-react";
import { AdminMetric, AdminSection } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { audienceLabel, shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/calendar-events";
import { formatDate, formatPercent } from "@/lib/utils";
import { getAdminAttentionStudents, getAdminDashboard } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireSession(["ADMIN"]);
  const [dashboard, attentionStudents] = await Promise.all([
    getAdminDashboard(session.schoolId),
    getAdminAttentionStudents(session.schoolId)
  ]);
  const firstName = session.name.split(" ")[0] || "Admin";

  return (
    <main className="page-shell">
      <section className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[34%] bg-[linear-gradient(145deg,transparent_0_28%,hsl(var(--school-primary-soft))_29%_54%,hsl(var(--school-blue-700))_55%_73%,hsl(var(--school-navy))_74%_100%)] lg:block" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-text-muted">Dashboard administrativo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-school-navy">Olá, {firstName}!</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Aqui está o resumo geral da escola: matrículas, turmas, frequência e pontos de atenção.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetric label="Alunos ativos" value={dashboard.metrics.students} detail="na base" icon={GraduationCap} />
        <AdminMetric
          label="Matrículas ativas"
          value={dashboard.metrics.activeEnrollments}
          detail="ano letivo"
          icon={ClipboardCheck}
        />
        <AdminMetric label="Turmas" value={dashboard.metrics.classrooms} detail="organizadas" icon={School} />
        <AdminMetric label="Professores" value={dashboard.metrics.teachers} detail="equipe ativa" icon={Users} />
        <AdminMetric
          label="Frequência média"
          value={formatPercent(dashboard.metrics.attendanceAverage)}
          detail="presenças"
          tone="success"
          icon={CalendarDays}
        />
        <AdminMetric
          label="Em atenção"
          value={dashboard.metrics.belowExpected}
          detail={dashboard.metrics.belowExpected ? "média ou frequência" : "Tudo em dia"}
          tone={dashboard.metrics.belowExpected ? "warning" : "success"}
          icon={AlertTriangle}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr_0.9fr]">
        <AdminSection
          title="Matrículas recentes"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/matriculas">Ver todas</Link>
            </Button>
          }
        >
          <div className="divide-y divide-border">
            {dashboard.recentEnrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/admin/alunos/${enrollment.studentId}`}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:text-school-primary"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-school-navy">{enrollment.student.fullName}</strong>
                  <span className="mt-1 block truncate text-xs text-text-muted">
                    {enrollment.registration} · {enrollment.classroom.name}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="success">Ativa</Badge>
                  <span className="mt-1 block text-xs text-text-muted">{formatDate(enrollment.enrolledAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </AdminSection>

        <AdminSection
          title="Desempenho por turma"
          description="Média e frequência registradas."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/relatorios">Relatório</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            {dashboard.classroomSummaries.map((classroom) => (
              <Link key={classroom.id} href={`/admin/turmas/${classroom.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-school-navy">{classroom.name}</h3>
                    <p className="text-xs text-text-muted">
                      {classroom.gradeLevel} · {shiftLabel(classroom.shift)} · {classroom.students} alunos
                    </p>
                  </div>
                  <span className="text-sm text-text-secondary">Média {classroom.averageGrade.toFixed(1)}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={classroom.attendance} />
                  <p className="mt-1 text-xs text-text-muted">Frequência {formatPercent(classroom.attendance)}</p>
                </div>
              </Link>
            ))}
          </div>
        </AdminSection>

        <AdminSection
          title="Próximos eventos"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/calendario">Ver calendário</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {dashboard.events.map((event) => {
              const eventDate = new Date(event.startsAt);
              return (
                <Link
                  key={event.id}
                  href="/admin/calendario"
                  className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-school-primary-soft"
                >
                  <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-background text-school-navy">
                    <strong className="text-lg leading-none">{String(eventDate.getDate()).padStart(2, "0")}</strong>
                    <span className="mt-1 text-[10px] font-semibold uppercase">
                      {eventDate.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-school-navy">{event.title}</strong>
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatEventDateTime(event)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </AdminSection>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <AdminSection
          title="Ações rápidas"
          description="Atalhos para os fluxos administrativos principais."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/admin/matriculas/nova">Nova matrícula</Link>
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

        <AdminSection title="Atenções" description="Alunos que exigem acompanhamento da secretaria.">
          <div className="grid gap-3 md:grid-cols-2">
            {attentionStudents.length ? (
              attentionStudents.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/alunos/${item.studentId}`}
                  className="rounded-md border border-border p-3 hover:bg-school-primary-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-school-navy">{item.studentName}</strong>
                    <Badge variant="warning">{item.reasons[0]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.classroomName} · média {item.averageGrade.toFixed(1)} · frequência{" "}
                    {formatPercent(item.attendanceRate)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Nenhum aluno em atenção no momento.</p>
            )}
          </div>
        </AdminSection>
      </section>

      <AdminSection title="Comunicados recentes">
        <div className="grid gap-4 md:grid-cols-3">
          {dashboard.announcements.map((announcement) => (
            <article key={announcement.id} className="border-r border-border pr-4 last:border-r-0">
              <Badge>{audienceLabel(announcement.audience)}</Badge>
              <h3 className="mt-3 font-semibold text-school-navy">{announcement.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">{announcement.content}</p>
            </article>
          ))}
        </div>
      </AdminSection>
    </main>
  );
}
