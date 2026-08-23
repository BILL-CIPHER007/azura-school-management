import Link from "next/link";
import { BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, NotebookTabs, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard";
import { StudentEmptyState, StudentMetric, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { formatEventTime } from "@/lib/calendar-events";
import { latestGrades, summarizeAttendance } from "@/lib/student-academics";
import { compactText, studentAudienceLabel, studentFirstName } from "@/lib/student-labels";
import { formatDate, formatPercent } from "@/lib/utils";
import { getStudentPortal, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";

function EventDate({ date }: { date: Date }) {
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");

  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-school-primary-soft text-school-navy">
      <strong className="text-xl leading-none">{day}</strong>
      <span className="mt-1 text-[0.68rem] font-semibold uppercase leading-none">{month}</span>
    </div>
  );
}

export default async function StudentDashboardPage() {
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const summary = summarizeEnrollment(portal.enrollment);
  const performancePercent = Math.max(0, Math.min(100, summary.averageGrade * 10));
  const attendance = summarizeAttendance(portal.enrollment?.attendances ?? []);
  const grades = latestGrades(portal.enrollment?.grades ?? []);
  const classroom = portal.enrollment?.classroom;
  const academicYear = portal.enrollment?.academicYear.year;
  const highlightedEvents = portal.events.slice(0, 4);

  return (
    <main className="student-page">
      <StudentPageHeader
        title={`Olá, ${studentFirstName(portal.student.fullName)}!`}
        description="Que bom ter você aqui. Acompanhe seus resultados, frequência e próximos compromissos."
        eyebrow={classroom ? `${classroom.name} · Ano letivo ${academicYear}` : "Portal do aluno"}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric
          label="Média geral"
          value={summary.averageGrade.toFixed(1)}
          detail={summary.situation}
          icon={Star}
          tone="primary"
        />
        <StudentMetric
          label="Frequência"
          value={formatPercent(summary.attendanceRate)}
          detail={`${attendance.registered} aulas registradas`}
          icon={ClipboardCheck}
          tone="success"
        />
        <StudentMetric
          label="Turma"
          value={classroom?.name ?? "-"}
          detail={classroom?.gradeLevel ?? "Sem matrícula ativa"}
          icon={GraduationCap}
          tone="info"
        />
        <StudentMetric
          label="Ausências"
          value={summary.absences}
          detail={`${attendance.justified} justificadas`}
          icon={BookOpenCheck}
          tone={summary.absences > 0 ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr_1fr]">
        <StudentSection title="Últimas notas" actionHref="/aluno/boletim" actionLabel="Ver boletim">
          {grades.length ? (
            <div className="divide-y divide-border">
              {grades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-school-navy">{grade.subject.name}</p>
                    <p className="text-sm text-text-secondary">{grade.academicPeriod.name}</p>
                  </div>
                  <strong className="text-2xl font-semibold text-school-navy">{grade.average.toFixed(1)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhuma nota lançada" description="As avaliações aparecerão aqui quando forem registradas." />
          )}
        </StudentSection>

        <StudentSection title="Desempenho" actionHref="/aluno/boletim" actionLabel="Ver evolução">
          <div className="flex flex-col items-center py-2 text-center">
            <div
              className="grid h-44 w-44 place-items-center rounded-full p-3"
              style={{
                background: `conic-gradient(hsl(var(--school-primary)) ${performancePercent}%, hsl(var(--school-primary-soft)) 0)`
              }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_hsl(var(--border))]">
                <div>
                  <strong className="block text-5xl font-semibold text-school-navy">{summary.averageGrade.toFixed(1)}</strong>
                  <span className="text-sm text-text-secondary">Média atual</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-school-navy">{summary.situation}</p>
            <ProgressBar value={performancePercent} className="mt-4" />
          </div>
        </StudentSection>

        <StudentSection title="Próximos eventos" actionHref="/aluno/calendario" actionLabel="Ver calendário">
          {highlightedEvents.length ? (
            <div className="divide-y divide-border">
              {highlightedEvents.map((event) => (
                <div key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <EventDate date={event.startsAt} />
                  <div className="min-w-0">
                    <p className="font-semibold text-school-navy">{event.title}</p>
                    {formatEventTime(event) ? <p className="mt-1 text-sm text-text-secondary">{formatEventTime(event)}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum evento próximo" description="Os compromissos escolares aparecerão nesta área." />
          )}
        </StudentSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <StudentSection title="Comunicados recentes" actionHref="/aluno/comunicados" actionLabel="Ver todos">
          {portal.announcements.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {portal.announcements.slice(0, 3).map((announcement) => (
                <Link
                  key={announcement.id}
                  href={`/aluno/comunicados?id=${announcement.id}`}
                  className="rounded-lg border border-border bg-surface-muted/60 p-4 transition-colors hover:border-school-primary hover:bg-school-primary-soft/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{studentAudienceLabel(announcement.audience)}</Badge>
                    <span className="text-xs text-text-muted">{formatDate(announcement.publishedAt)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-school-navy">{announcement.title}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{compactText(announcement.content, 100)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum comunicado" description="Avisos da escola aparecerão aqui." />
          )}
        </StudentSection>

        <StudentSection title="Resumo acadêmico">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-school-navy">Frequência geral</span>
                <span className="text-text-secondary">{formatPercent(summary.attendanceRate)}</span>
              </div>
              <ProgressBar value={summary.attendanceRate} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-school-primary-soft p-3">
                <NotebookTabs className="h-4 w-4 text-school-primary" />
                <p className="mt-2 text-xs text-text-secondary">Disciplinas avaliadas</p>
                <strong className="text-xl text-school-navy">{summary.subjectAverages.length}</strong>
              </div>
              <div className="rounded-lg bg-school-primary-soft p-3">
                <CalendarDays className="h-4 w-4 text-school-primary" />
                <p className="mt-2 text-xs text-text-secondary">Eventos na agenda</p>
                <strong className="text-xl text-school-navy">{portal.events.length}</strong>
              </div>
            </div>
          </div>
        </StudentSection>
      </section>
    </main>
  );
}
