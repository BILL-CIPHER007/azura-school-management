import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, GraduationCap, NotebookTabs, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { announcementSenderName } from "@/lib/announcements";
import { requireSession } from "@/lib/auth";
import {
  buildGuardianAttention,
  buildGuardianGradeRows,
  latestGuardianGrades,
  summarizeGuardianAttendance
} from "@/lib/guardian-academics";
import {
  guardianAcademicTone,
  guardianAudienceLabel,
  guardianCompactText,
  guardianEventTypeLabel,
  guardianFirstName,
  guardianShiftLabel
} from "@/lib/guardian-labels";
import { isAttendanceBelowMinimum, isPassingVisibleGrade } from "@/lib/academic-rules";
import { formatEventTime } from "@/lib/calendar-events";
import { formatDate, formatPercent } from "@/lib/utils";
import { getGuardianPortal, summarizeEnrollment } from "@/services/school-data";

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

export default async function GuardianDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requireSession(["RESPONSAVEL"]);
  const query = await searchParams;
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const isAcademicYearFinal = portal.enrollment ? Boolean(portal.enrollment.academicYear.closedAt) : false;
  const summary = summarizeEnrollment(portal.enrollment, { isFinal: isAcademicYearFinal });
  const attendance = summarizeGuardianAttendance(portal.enrollment?.attendances ?? []);
  const gradeRows = buildGuardianGradeRows(portal.enrollment?.grades ?? [], summary.attendanceRate);
  const studentIdParam = portal.selectedStudent ? `?studentId=${encodeURIComponent(portal.selectedStudent.id)}` : "";
  const absenceHistoryHref = portal.selectedStudent
    ? `/responsavel/frequencia?studentId=${encodeURIComponent(portal.selectedStudent.id)}&status=ausente`
    : "/responsavel/frequencia";
  const attention = buildGuardianAttention({
    gradeRows,
    attendanceRate: summary.attendanceRate,
    attendances: portal.enrollment?.attendances ?? [],
    absenceHistoryHref
  });
  const latestGrades = latestGuardianGrades(portal.enrollment?.grades ?? []);
  const upcomingEvents = [...portal.events].sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime()).slice(0, 4);
  const recentAnnouncements = [...portal.announcements]
    .sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime())
    .slice(0, 4);
  const selectedName = portal.selectedStudent?.fullName ?? "aluno";
  const classroom = portal.enrollment?.classroom;
  const attendanceNeedsAttention = summary.attendanceRate > 0 && isAttendanceBelowMinimum(summary.attendanceRate);

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title={`Acompanhamento de ${guardianFirstName(selectedName)}`}
          description="Confira desempenho, frequência, pontos de atenção e próximos compromissos."
          eyebrow={
            classroom
              ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)} · ${portal.enrollment?.academicYear.year}`
              : "Portal do responsável"
          }
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Média geral" value={summary.averageGrade.toFixed(1)} detail={summary.situation} icon={NotebookTabs} tone="primary" />
        <GuardianMetric
          label="Frequência"
          value={formatPercent(summary.attendanceRate)}
          detail={`${attendance.registered} aulas registradas`}
          alert={attendanceNeedsAttention ? "Acompanhar de perto" : undefined}
          icon={ClipboardCheck}
          tone={attendanceNeedsAttention ? "warning" : "success"}
        />
        <GuardianMetric
          label="Faltas"
          value={summary.absences}
          detail={`${attendance.justified} justificadas`}
          alert={summary.absences > 0 ? "Ver histórico" : undefined}
          icon={ShieldAlert}
          tone={summary.absences > 0 ? "warning" : "success"}
        />
        <GuardianMetric label="Turma" value={classroom?.name ?? "-"} detail={classroom?.gradeLevel ?? "Sem matrícula ativa"} icon={GraduationCap} tone="info" />
      </section>

      <GuardianSection
        title="Precisa de atenção"
        description="Sinais rápidos para orientar o acompanhamento em casa."
        className={attention.length ? "border-warning/35" : "border-success/25"}
      >
        {attention.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {attention.map((item) => (
              <div key={`${item.title}-${item.value}`} className="rounded-lg border border-warning/25 bg-warning-soft/70 p-4 text-warning">
                <p className="text-sm font-semibold">{item.title}</p>
                <strong className="mt-2 block text-xl">{item.value}</strong>
                <p className="mt-1 text-sm leading-6">{item.description}</p>
                {item.actionHref && item.actionLabel ? (
                  <Link href={item.actionHref} className="mt-3 inline-flex text-xs font-semibold hover:underline">
                    {item.actionLabel}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success-soft p-4 text-success">
            <BookOpenCheck className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Tudo em dia</p>
              <p className="text-sm leading-6">Nenhum ponto de atenção no momento.</p>
            </div>
          </div>
        )}
      </GuardianSection>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GuardianSection title="Desempenho acadêmico" actionHref={`/responsavel/boletim${studentIdParam}`} actionLabel="Ver boletim completo">
          {gradeRows.length ? (
            <div className="grid gap-4">
              {gradeRows.slice(0, 6).map((row) => (
                <div key={row.subject.id} className="rounded-lg border border-border bg-surface-muted/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-school-navy">{row.subject.name}</p>
                      <p className="text-sm text-text-secondary">{guardianAcademicTone(row.average)}</p>
                    </div>
                    <strong className="text-xl text-school-navy">{row.average.toFixed(1)}</strong>
                  </div>
                  <ProgressBar value={row.average * 10} className="mt-3" />
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhuma nota lançada" description="O desempenho aparecerá quando a escola registrar avaliações." />
          )}
        </GuardianSection>

        <GuardianSection title="Últimos resultados" description="Avaliações registradas mais recentemente.">
          {latestGrades.length ? (
            <div className="divide-y divide-border">
              {latestGrades.map((grade) => (
                <div key={grade.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-school-navy">{grade.subject.name}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {grade.academicPeriod.name} · AV1 {grade.av1.toFixed(1)} · AV2 {grade.av2.toFixed(1)} · Trabalho {grade.assignment.toFixed(1)}
                    </p>
                    {grade.updatedAt ? (
                      <p className="mt-1 text-xs text-text-muted">Atualizado em {formatDate(grade.updatedAt)}</p>
                    ) : null}
                  </div>
                  <Badge variant={isPassingVisibleGrade(grade.average) ? "success" : "warning"}>
                    {grade.average.toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Sem resultados recentes" />
          )}
        </GuardianSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GuardianSection title="Próximos eventos" actionHref={`/responsavel/calendario${studentIdParam}`} actionLabel="Ver calendário">
          {upcomingEvents.length ? (
            <div className="divide-y divide-border">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <EventDate date={event.startsAt} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-school-navy">{event.title}</p>
                      <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
                    </div>
                    {formatEventTime(event) ? <p className="mt-1 text-sm text-text-secondary">{formatEventTime(event)}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum evento próximo" />
          )}
        </GuardianSection>

        <GuardianSection title="Comunicados recentes" actionHref={`/responsavel/comunicados${studentIdParam}`} actionLabel="Ver todos">
          {recentAnnouncements.length ? (
            <div className="divide-y divide-border">
              {recentAnnouncements.map((announcement) => (
                <Link
                  key={announcement.id}
                  href={`/responsavel/comunicados?studentId=${portal.selectedStudent?.id ?? ""}&id=${announcement.id}`}
                  className="block py-3 first:pt-0 last:pb-0 hover:text-school-primary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-school-navy">{announcement.title}</p>
                    <Badge variant="info">{guardianAudienceLabel(announcement.audience)}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {announcementSenderName(announcement)} · {formatDate(announcement.publishedAt)} ·{" "}
                    {guardianCompactText(announcement.content, 90)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum comunicado" />
          )}
        </GuardianSection>
      </section>
    </main>
  );
}
