import Link from "next/link";
import { BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, NotebookTabs } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentEmptyState, StudentMetric, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { latestGrades, summarizeAttendance } from "@/lib/student-academics";
import { compactText, studentAudienceLabel, studentEventTypeLabel, studentFirstName } from "@/lib/student-labels";
import { formatDate, formatPercent } from "@/lib/utils";
import { getStudentPortal, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const summary = summarizeEnrollment(portal.enrollment);
  const attendance = summarizeAttendance(portal.enrollment?.attendances ?? []);
  const grades = latestGrades(portal.enrollment?.grades ?? []);
  const classroom = portal.enrollment?.classroom;
  const academicYear = portal.enrollment?.academicYear.year;

  return (
    <main className="page-shell">
      <StudentPageHeader
        title={`Olá, ${studentFirstName(portal.student.fullName)}!`}
        description="Aqui está um resumo do seu desempenho acadêmico."
        eyebrow={classroom ? `${classroom.name} · ${academicYear}` : "Portal do aluno"}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric
          label="Média geral"
          value={summary.averageGrade.toFixed(1)}
          detail={summary.situation}
          icon={NotebookTabs}
        />
        <StudentMetric
          label="Frequência"
          value={formatPercent(summary.attendanceRate)}
          detail={`${attendance.registered} aulas registradas`}
          icon={ClipboardCheck}
        />
        <StudentMetric label="Faltas" value={summary.absences} detail={`${attendance.justified} justificadas`} icon={BookOpenCheck} />
        <StudentMetric
          label="Turma"
          value={classroom?.name ?? "-"}
          detail={classroom?.gradeLevel ?? "Sem matrícula ativa"}
          icon={GraduationCap}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <StudentSection title="Últimas notas" actionHref="/aluno/boletim" actionLabel="Ver boletim">
          {grades.length ? (
            <div className="divide-y">
              {grades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-950">{grade.subject.name}</p>
                    <p className="text-sm text-muted-foreground">{grade.academicPeriod.name}</p>
                  </div>
                  <strong className="text-xl font-semibold text-slate-950">{grade.average.toFixed(1)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhuma nota lançada" description="As avaliações aparecerão aqui quando forem registradas." />
          )}
        </StudentSection>

        <StudentSection title="Próximos eventos" actionHref="/aluno/calendario" actionLabel="Ver calendário">
          {portal.events.length ? (
            <div className="divide-y">
              {portal.events.slice(0, 4).map((event) => (
                <div key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-950">{event.title}</p>
                      <Badge variant="info">{studentEventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum evento próximo" description="Os compromissos escolares aparecerão nesta área." />
          )}
        </StudentSection>
      </section>

      <StudentSection title="Comunicados recentes" actionHref="/aluno/comunicados" actionLabel="Ver todos">
        {portal.announcements.length ? (
          <div className="divide-y">
            {portal.announcements.slice(0, 3).map((announcement, index) => (
              <Link
                key={announcement.id}
                href={`/aluno/comunicados?id=${announcement.id}`}
                className="block py-3 first:pt-0 last:pb-0 hover:text-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-950">{announcement.title}</p>
                  {index === 0 ? <Badge variant="success">Novo</Badge> : null}
                  <Badge variant="neutral">{studentAudienceLabel(announcement.audience)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Secretaria · {formatDate(announcement.publishedAt)} · {compactText(announcement.content, 100)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <StudentEmptyState title="Nenhum comunicado" description="Avisos da escola aparecerão aqui." />
        )}
      </StudentSection>
    </main>
  );
}
