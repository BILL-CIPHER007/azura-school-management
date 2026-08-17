import Link from "next/link";
import { BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, NotebookTabs, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
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
import { isPassingGrade } from "@/lib/academic-rules";
import { formatDate, formatPercent } from "@/lib/utils";
import { getGuardianPortal, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardianDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requireSession(["RESPONSAVEL"]);
  const query = await searchParams;
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const summary = summarizeEnrollment(portal.enrollment);
  const attendance = summarizeGuardianAttendance(portal.enrollment?.attendances ?? []);
  const gradeRows = buildGuardianGradeRows(portal.enrollment?.grades ?? [], summary.attendanceRate);
  const attention = buildGuardianAttention({
    gradeRows,
    attendanceRate: summary.attendanceRate,
    attendances: portal.enrollment?.attendances ?? []
  });
  const latestGrades = latestGuardianGrades(portal.enrollment?.grades ?? []);
  const studentIdParam = portal.selectedStudent ? `?studentId=${encodeURIComponent(portal.selectedStudent.id)}` : "";
  const selectedName = portal.selectedStudent?.fullName ?? "aluno";
  const classroom = portal.enrollment?.classroom;

  return (
    <main className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GuardianPageHeader
          title={`Acompanhamento de ${guardianFirstName(selectedName)}`}
          description="Confira o desempenho, frequência e próximos compromissos."
          eyebrow={
            classroom
              ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)} · ${portal.enrollment?.academicYear.year}`
              : "Portal do responsável"
          }
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Média geral" value={summary.averageGrade.toFixed(1)} detail={summary.situation} icon={NotebookTabs} />
        <GuardianMetric
          label="Frequência"
          value={formatPercent(summary.attendanceRate)}
          detail={`${attendance.registered} aulas registradas`}
          alert={summary.attendanceRate > 0 && summary.attendanceRate < 85 ? "Acompanhar de perto" : undefined}
          icon={ClipboardCheck}
        />
        <GuardianMetric label="Faltas" value={summary.absences} detail={`${attendance.justified} justificadas`} icon={ShieldAlert} />
        <GuardianMetric label="Turma" value={classroom?.name ?? "-"} detail={classroom?.gradeLevel ?? "Sem matrícula ativa"} icon={GraduationCap} />
      </section>

      <GuardianSection title="Precisa de atenção" className={attention.length ? "ring-amber-200" : undefined}>
        {attention.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {attention.map((item) => (
              <div key={`${item.title}-${item.value}`} className="rounded-md bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
                <p className="text-sm font-semibold">{item.title}</p>
                <strong className="mt-2 block text-lg">{item.value}</strong>
                <p className="mt-1 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
            <BookOpenCheck className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Tudo em dia</p>
              <p className="text-sm">Nenhum ponto de atenção no momento.</p>
            </div>
          </div>
        )}
      </GuardianSection>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <GuardianSection title="Desempenho acadêmico" actionHref={`/responsavel/boletim${studentIdParam}`} actionLabel="Ver boletim completo">
          {gradeRows.length ? (
            <div className="grid gap-4">
              {gradeRows.map((row) => (
                <div key={row.subject.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{row.subject.name}</p>
                      <p className="text-sm text-muted-foreground">{guardianAcademicTone(row.average)}</p>
                    </div>
                    <strong className="text-lg text-slate-950">{row.average.toFixed(1)}</strong>
                  </div>
                  <ProgressBar value={row.average * 10} className="mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhuma nota lançada" description="O desempenho aparecerá quando a escola registrar avaliações." />
          )}
        </GuardianSection>

        <GuardianSection title="Últimos resultados">
          {latestGrades.length ? (
            <div className="divide-y">
              {latestGrades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-950">{grade.subject.name}</p>
                    <p className="text-sm text-muted-foreground">{grade.academicPeriod.name} · {formatDate(grade.updatedAt ?? new Date())}</p>
                  </div>
                  <Badge variant={isPassingGrade(grade.average) ? "success" : "warning"}>{grade.average.toFixed(1)}</Badge>
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
          {portal.events.length ? (
            <div className="divide-y">
              {portal.events.slice(0, 4).map((event) => (
                <div key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-950">{event.title}</p>
                      <Badge variant="info">{guardianEventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum evento próximo" />
          )}
        </GuardianSection>

        <GuardianSection title="Comunicados recentes" actionHref={`/responsavel/comunicados${studentIdParam}`} actionLabel="Ver todos">
          {portal.announcements.length ? (
            <div className="divide-y">
              {portal.announcements.slice(0, 4).map((announcement, index) => (
                <Link
                  key={announcement.id}
                  href={`/responsavel/comunicados?studentId=${portal.selectedStudent?.id ?? ""}&id=${announcement.id}`}
                  className="block py-3 first:pt-0 last:pb-0 hover:text-primary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{announcement.title}</p>
                    {index === 0 ? <Badge variant="success">Novo</Badge> : null}
                    <Badge>{guardianAudienceLabel(announcement.audience)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Secretaria · {formatDate(announcement.publishedAt)} · {guardianCompactText(announcement.content, 90)}
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
