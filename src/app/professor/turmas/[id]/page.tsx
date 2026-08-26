import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, CalendarCheck, Eye, FilePenLine, ListChecks, UsersRound, X } from "lucide-react";
import { AttendanceList } from "@/components/teacher/attendance-list";
import { GradeWorkspace } from "@/components/teacher/grade-workspace";
import {
  ClassTabs,
  StatusBadge,
  TeacherBreadcrumb,
  TeacherMetric,
  TeacherPageHeader,
  TeacherSection
} from "@/components/teacher/teacher-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { isAttendanceBelowMinimum, isPassingGrade } from "@/lib/academic-rules";
import { attendanceLabel, shiftLabel } from "@/lib/teacher-labels";
import { average, cn, formatDate, formatPercent, gradeSituation } from "@/lib/utils";
import { getTeacherClassroomWorkspace } from "@/services/school-data";

export const dynamic = "force-dynamic";

const allowedTabs = ["resumo", "alunos", "notas", "frequencia"] as const;

type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type AttendanceRecord = {
  id: string;
  enrollmentId: string;
  studentName: string;
  status: AttendanceStatus;
  date: Date;
  updatedAt: Date;
  subjectId: string;
  subject: { id: string; name: string };
};

type AttendanceSession = {
  key: string;
  date: Date;
  dateKey: string;
  subjectId: string;
  subjectName: string;
  latestUpdatedAt: Date;
  counts: Record<AttendanceStatus, number>;
  students: Array<{ id: string; name: string; status: AttendanceStatus }>;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  date: Date;
};

type ActionItem = {
  id: string;
  title: string;
  description: string;
};

type TeacherStudentSituation = "Regular" | "Em atenção" | "Recuperação" | "Frequência baixa" | "Aprovado" | "Reprovado";

type StudentSubjectSummary = {
  id: string;
  name: string;
  average: number;
};

function getTeacherStudentSituation(
  averageScore: number,
  attendanceRate: number,
  academicYearEnded: boolean
): TeacherStudentSituation {
  if (academicYearEnded) return gradeSituation(averageScore, attendanceRate) as TeacherStudentSituation;
  if (isAttendanceBelowMinimum(attendanceRate)) return "Frequência baixa";
  if (isPassingGrade(averageScore) || averageScore === 0) return "Regular";
  if (averageScore >= schoolConfig.academic.recoveryGrade) return "Recuperação";
  return "Em atenção";
}

function buildStudentSubjectSummaries(
  grades: Array<{ subjectId: string; average: number; subject: { name: string } }>
): StudentSubjectSummary[] {
  const bySubject = new Map<string, { name: string; averages: number[] }>();

  for (const grade of grades) {
    const current = bySubject.get(grade.subjectId) ?? { name: grade.subject.name, averages: [] };
    current.averages.push(grade.average);
    bySubject.set(grade.subjectId, current);
  }

  return [...bySubject.entries()]
    .map(([id, item]) => ({
      id,
      name: item.name,
      average: average(item.averages)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDateTime(date: Date) {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return sameDay ? `Hoje, ${time}` : formatDate(date);
}

function buildAttendanceSessions(records: AttendanceRecord[]) {
  const sessions = new Map<string, AttendanceSession>();

  for (const record of records) {
    const dateKey = toDateKey(record.date);
    const key = `${dateKey}__${record.subjectId}`;
    const current =
      sessions.get(key) ??
      ({
        key,
        date: record.date,
        dateKey,
        subjectId: record.subjectId,
        subjectName: record.subject.name,
        latestUpdatedAt: record.updatedAt,
        counts: { PRESENT: 0, ABSENT: 0, JUSTIFIED: 0 },
        students: []
      } satisfies AttendanceSession);

    current.counts[record.status] += 1;
    current.students.push({
      id: record.id,
      name: record.studentName,
      status: record.status
    });
    if (record.updatedAt > current.latestUpdatedAt) current.latestUpdatedAt = record.updatedAt;
    sessions.set(key, current);
  }

  return [...sessions.values()].sort(
    (a, b) => b.date.getTime() - a.date.getTime() || b.latestUpdatedAt.getTime() - a.latestUpdatedAt.getTime()
  );
}

function buildGradeActivities(
  grades: Array<{
    id: string;
    subjectId: string;
    average: number;
    updatedAt: Date;
    subject: { name: string };
    academicPeriodId: string;
    academicPeriod: { name: string };
  }>
) {
  const groups = new Map<string, { latest: Date; count: number; subjectName: string; periodName: string }>();

  for (const grade of grades) {
    const key = `${grade.subjectId}__${grade.academicPeriodId}`;
    const current = groups.get(key) ?? {
      latest: grade.updatedAt,
      count: 0,
      subjectName: grade.subject.name,
      periodName: grade.academicPeriod.name
    };
    current.count += 1;
    if (grade.updatedAt > current.latest) current.latest = grade.updatedAt;
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, group]) => ({
    id: `grades-${key}`,
    title: `Notas do ${group.periodName} atualizadas`,
    subtitle: group.subjectName,
    meta: `${group.count} alunos · ${formatShortDateTime(group.latest)}`,
    date: group.latest
  }));
}

function buildRecentActivity(grades: Parameters<typeof buildGradeActivities>[0], attendanceSessions: AttendanceSession[]) {
  const attendanceActivity = attendanceSessions.map((session) => ({
    id: `attendance-${session.key}`,
    title: "Frequência registrada",
    subtitle: `${session.subjectName} · ${formatDate(session.date)}`,
    meta: `${session.counts.PRESENT} presentes · ${session.counts.ABSENT} ausentes · ${session.counts.JUSTIFIED} justificados`,
    date: session.latestUpdatedAt
  }));

  return [...buildGradeActivities(grades), ...attendanceActivity].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
}

function buildHistoryHref(
  classroomId: string,
  filters: {
    subjectId?: string;
    periodId?: string;
    startDate?: string;
    endDate?: string;
  },
  extra?: { chamada?: string }
) {
  const params = new URLSearchParams();
  params.set("tab", "frequencia");
  params.set("freqView", "historico");
  if (filters.subjectId) params.set("historicoDisciplina", filters.subjectId);
  if (filters.periodId) params.set("periodoHistorico", filters.periodId);
  if (filters.startDate) params.set("inicio", filters.startDate);
  if (filters.endDate) params.set("fim", filters.endDate);
  if (extra?.chamada) params.set("chamada", extra.chamada);
  return `/professor/turmas/${classroomId}?${params.toString()}${extra?.chamada ? "#detalhe-chamada" : ""}`;
}

function formatAttendanceSessionSummary(session: AttendanceSession) {
  return `${session.students.length} alunos · ${session.counts.PRESENT} presentes · ${session.counts.ABSENT} ausente${
    session.counts.ABSENT === 1 ? "" : "s"
  } · ${session.counts.JUSTIFIED} justificado${session.counts.JUSTIFIED === 1 ? "" : "s"}`;
}

export default async function TeacherClassroomPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    subjectId?: string;
    periodId?: string;
    data?: string;
    salvo?: string;
    freqView?: string;
    historicoDisciplina?: string;
    periodoHistorico?: string;
    inicio?: string;
    fim?: string;
    chamada?: string;
  }>;
}) {
  const session = await requireSession(["PROFESSOR"]);
  const { id } = await params;
  const query = await searchParams;
  const payload = await getTeacherClassroomWorkspace(session.schoolId, session.id, id, query.subjectId);
  if (!payload) notFound();

  const { classroom, assignments, periods, activeSubjectId } = payload;
  const activeTab = allowedTabs.includes(query.tab as (typeof allowedTabs)[number])
    ? query.tab ?? "resumo"
    : "resumo";
  const activeSubject = assignments.find((assignment) => assignment.subjectId === activeSubjectId) ?? assignments[0];
  const periodId = query.periodId ?? periods[0]?.id ?? "";
  const attendanceDate = query.data ?? schoolConfig.academic.teacherDefaultAttendanceDate;
  const frequencyView = query.freqView === "historico" ? "historico" : "registrar";

  const allGrades = classroom.enrollments.flatMap((enrollment) => enrollment.grades);
  const allAttendances = classroom.enrollments.flatMap((enrollment) =>
    enrollment.attendances.map((attendance) => ({
      ...attendance,
      enrollmentId: enrollment.id,
      studentName: enrollment.student.fullName
    }))
  );
  const attendanceSessions = buildAttendanceSessions(allAttendances);
  const historyFilters = {
    subjectId:
      query.historicoDisciplina && assignments.some((assignment) => assignment.subjectId === query.historicoDisciplina)
        ? query.historicoDisciplina
        : "",
    periodId: query.periodoHistorico && periods.some((period) => period.id === query.periodoHistorico) ? query.periodoHistorico : "",
    startDate: query.inicio ?? "",
    endDate: query.fim ?? ""
  };
  const selectedPeriodForHistory = periods.find((period) => period.id === historyFilters.periodId);
  const filteredAttendanceSessions = attendanceSessions.filter((session) => {
    if (historyFilters.subjectId && session.subjectId !== historyFilters.subjectId) return false;
    if (selectedPeriodForHistory) {
      const time = session.date.getTime();
      if (time < selectedPeriodForHistory.startsAt.getTime() || time > selectedPeriodForHistory.endsAt.getTime()) return false;
    }
    if (historyFilters.startDate && session.date < new Date(`${historyFilters.startDate}T00:00:00.000Z`)) return false;
    if (historyFilters.endDate && session.date > new Date(`${historyFilters.endDate}T23:59:59.999Z`)) return false;
    return true;
  });
  const selectedAttendanceSession = query.chamada
    ? filteredAttendanceSessions.find((session) => session.key === query.chamada) ?? null
    : null;
  const generalAverage = average(allGrades.map((grade) => grade.average));
  const attendanceRate = allAttendances.length
    ? (allAttendances.filter((attendance) => attendance.status === "PRESENT").length / allAttendances.length) * 100
    : 0;
  const pendingRecords = classroom.enrollments.length * assignments.length * periods.length - allGrades.length;
  const currentAttendanceCount = classroom.enrollments.filter((enrollment) =>
    enrollment.attendances.some(
      (attendance) => attendance.subjectId === activeSubjectId && attendance.date.toISOString().slice(0, 10) === attendanceDate
    )
  ).length;
  const missingAttendanceCount = Math.max(0, classroom.enrollments.length - currentAttendanceCount);
  const pendingItems: ActionItem[] = [];
  if (pendingRecords > 0) {
    pendingItems.push({
      id: "pending-grades",
      title: "Notas incompletas",
      description: `${Math.max(0, pendingRecords)} registros de avaliação ainda não foram lançados.`
    });
  }
  if (missingAttendanceCount > 0) {
    pendingItems.push({
      id: "pending-attendance",
      title: "Chamada incompleta",
      description: `${missingAttendanceCount} de ${classroom.enrollments.length} alunos ainda não possuem registro de frequência em ${formatDate(
        new Date(`${attendanceDate}T12:00:00.000Z`)
      )} para ${activeSubject.subject.name}.`
    });
  }
  const upcomingItems: ActionItem[] = periods
    .filter((period) => period.endsAt >= new Date())
    .slice(0, 2)
    .map((period) => ({
      id: `period-${period.id}`,
      title: `Fechamento do ${period.name}`,
      description: `Período encerra em ${formatDate(period.endsAt)}.`
    }));
  const recentActivity = buildRecentActivity(allGrades, attendanceSessions);

  return (
    <main className="teacher-page">
      <TeacherBreadcrumb
        items={[
          { label: "Minhas Turmas", href: "/professor/turmas" },
          { label: classroom.name }
        ]}
      />

      <TeacherPageHeader
        title={classroom.name}
        description={`${assignments.map((assignment) => assignment.subject.name).join(", ")} · ${shiftLabel(
          classroom.shift
        )} · ${classroom.enrollments.length} alunos · ${classroom.academicYear.year}`}
      />

      {query.salvo ? (
        <Badge variant="success" className="w-fit">
          Alterações salvas com sucesso
        </Badge>
      ) : null}

      <div className="teacher-surface">
        <ClassTabs classroomId={classroom.id} activeTab={activeTab} subjectId={activeSubjectId} periodId={periodId} />
        <div className="p-5">
          {activeTab === "resumo" ? (
            <SummaryTab
              students={classroom.enrollments.length}
              averageGrade={generalAverage}
              attendanceRate={attendanceRate}
              pendingRecords={Math.max(0, pendingRecords)}
              recentActivity={recentActivity}
              upcomingItems={upcomingItems}
              pendingItems={pendingItems}
            />
          ) : null}

          {activeTab === "alunos" ? (
            <StudentsTab
              classroomId={classroom.id}
              activeSubjectId={activeSubjectId}
              periodId={periodId}
              enrollments={classroom.enrollments.map((enrollment) => {
                const gradeAverage = average(enrollment.grades.map((grade) => grade.average));
                const studentAttendance = enrollment.attendances.length
                  ? (enrollment.attendances.filter((attendance) => attendance.status === "PRESENT").length /
                      enrollment.attendances.length) *
                    100
                  : 0;
                return {
                  id: enrollment.id,
                  studentName: enrollment.student.fullName,
                  registration: enrollment.registration,
                  average: gradeAverage,
                  attendance: studentAttendance,
                  situation: getTeacherStudentSituation(
                    gradeAverage,
                    studentAttendance,
                    classroom.academicYear.endsAt < new Date()
                  ),
                  subjectSummaries: buildStudentSubjectSummaries(enrollment.grades)
                };
              })}
            />
          ) : null}

          {activeTab === "notas" ? (
            <GradesTab
              classroomId={classroom.id}
              assignments={assignments}
              periods={periods}
              activeSubjectId={activeSubjectId}
              periodId={periodId}
              saved={query.salvo === "1"}
              rows={classroom.enrollments.map((enrollment) => {
                const grade = enrollment.grades.find(
                  (item) => item.subjectId === activeSubjectId && item.academicPeriodId === periodId
                );
                return {
                  enrollmentId: enrollment.id,
                  studentName: enrollment.student.fullName,
                  av1: grade?.av1 ?? 0,
                  av2: grade?.av2 ?? 0,
                  assignment: grade?.assignment ?? 0
                };
              })}
            />
          ) : null}

          {activeTab === "frequencia" ? (
            <AttendanceTab
              classroomId={classroom.id}
              assignments={assignments}
              activeSubjectId={activeSubjectId}
              activeSubjectName={activeSubject.subject.name}
              classroomName={classroom.name}
              date={attendanceDate}
              view={frequencyView}
              periods={periods}
              historyFilters={historyFilters}
              sessions={filteredAttendanceSessions}
              selectedSession={selectedAttendanceSession}
              students={classroom.enrollments.map((enrollment) => {
                const current = enrollment.attendances.find(
                  (attendance) =>
                    attendance.subjectId === activeSubjectId &&
                    attendance.date.toISOString().slice(0, 10) === attendanceDate
                );
                return {
                  enrollmentId: enrollment.id,
                  name: enrollment.student.fullName,
                  currentStatus: current?.status
                };
              })}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SummaryTab({
  students,
  averageGrade,
  attendanceRate,
  pendingRecords,
  recentActivity,
  upcomingItems,
  pendingItems
}: {
  students: number;
  averageGrade: number;
  attendanceRate: number;
  pendingRecords: number;
  recentActivity: ActivityItem[];
  upcomingItems: ActionItem[];
  pendingItems: ActionItem[];
}) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetric label="Alunos" value={students} icon={UsersRound} />
        <TeacherMetric label="Média geral" value={averageGrade.toFixed(1)} icon={BarChart3} />
        <TeacherMetric label="Frequência média" value={formatPercent(attendanceRate)} icon={CalendarCheck} tone="success" />
        <TeacherMetric
          label="Registros pendentes"
          value={pendingRecords}
          icon={FilePenLine}
          tone={pendingRecords ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <TeacherSection title="Atividade recente">
          <div className="space-y-3">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 rounded-md bg-surface-muted p-3 text-sm">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-school-primary-soft text-school-primary">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-school-navy">{activity.title}</strong>
                    <p className="mt-1 text-text-secondary">{activity.subtitle}</p>
                    <p className="mt-1 text-xs text-text-muted">{activity.meta}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Nenhuma atividade recente encontrada para esta turma.</p>
            )}
          </div>
        </TeacherSection>

        <TeacherSection title="Próximos prazos">
          <div className="space-y-3">
            {upcomingItems.length ? (
              upcomingItems.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-md bg-surface-muted p-3 text-sm">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                    <FilePenLine className="h-4 w-4" />
                  </span>
                  <div>
                    <strong className="block text-school-navy">{item.title}</strong>
                    <p className="mt-1 text-text-secondary">{item.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Nenhum prazo acadêmico encontrado para esta turma.</p>
            )}
          </div>
        </TeacherSection>

        <TeacherSection title="Pendências">
          <div className="space-y-3">
            {pendingItems.length ? (
              pendingItems.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-md bg-warning-soft p-3 text-sm">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-warning">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  <div>
                    <strong className="block text-school-navy">{item.title}</strong>
                    <p className="mt-1 text-text-secondary">{item.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-success-soft p-3 text-sm">
                <strong className="block text-success">Tudo em dia</strong>
                <p className="mt-1 text-text-secondary">Nenhuma pendência encontrada para esta turma.</p>
              </div>
            )}
          </div>
        </TeacherSection>
      </section>
    </div>
  );
}

function StudentsTab({
  classroomId,
  activeSubjectId,
  periodId,
  enrollments
}: {
  classroomId: string;
  activeSubjectId: string;
  periodId: string;
  enrollments: Array<{
    id: string;
    studentName: string;
    registration: string;
    average: number;
    attendance: number;
    situation: TeacherStudentSituation;
    subjectSummaries: StudentSubjectSummary[];
  }>;
}) {
  const performanceHref = `/professor/turmas/${classroomId}?tab=notas&subjectId=${activeSubjectId}&periodId=${periodId}`;

  return (
    <div className="teacher-table-wrap">
      <table className="teacher-table min-w-[820px]">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Matrícula</th>
            <th>Média atual</th>
            <th>Frequência</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => (
            <tr key={enrollment.id}>
              <td>
                <details>
                  <summary className="cursor-pointer font-medium text-school-primary">{enrollment.studentName}</summary>
                  <div className="mt-3 grid max-w-xl gap-4 rounded-lg border border-border bg-surface-muted p-4 text-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-school-navy">Resumo acadêmico</h3>
                        <Link
                          href={performanceHref}
                          className="text-xs font-medium text-school-primary hover:underline"
                        >
                          Ver desempenho
                        </Link>
                      </div>
                      <dl className="grid gap-2 text-text-secondary sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-text-muted">Média geral</dt>
                          <dd className="font-semibold text-school-navy">{enrollment.average.toFixed(1)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">Frequência</dt>
                          <dd className="font-semibold text-school-navy">{formatPercent(enrollment.attendance)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">Situação</dt>
                          <dd>
                            <StatusBadge value={enrollment.situation} />
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="grid gap-2">
                      <h3 className="font-semibold text-school-navy">Disciplinas</h3>
                      <div className="grid gap-2">
                        {enrollment.subjectSummaries.length ? (
                          enrollment.subjectSummaries.map((subject) => (
                            <div
                              key={subject.id}
                              className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-text-secondary"
                            >
                              <span>{subject.name}</span>
                              <strong className="text-school-navy">{subject.average.toFixed(1)}</strong>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md bg-surface px-3 py-2 text-text-secondary">
                            Sem notas registradas nesta turma.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </td>
              <td>{enrollment.registration}</td>
              <td className="font-semibold">{enrollment.average.toFixed(1)}</td>
              <td>{formatPercent(enrollment.attendance)}</td>
              <td>
                <StatusBadge value={enrollment.situation} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GradesTab({
  classroomId,
  assignments,
  periods,
  activeSubjectId,
  periodId,
  rows,
  saved
}: {
  classroomId: string;
  assignments: Array<{ subjectId: string; subject: { id: string; name: string } }>;
  periods: Array<{ id: string; name: string }>;
  activeSubjectId: string;
  periodId: string;
  rows: Array<{ enrollmentId: string; studentName: string; av1: number; av2: number; assignment: number }>;
  saved: boolean;
}) {
  return (
    <GradeWorkspace
      classroomId={classroomId}
      assignments={assignments}
      periods={periods}
      activeSubjectId={activeSubjectId}
      periodId={periodId}
      rows={rows}
      minimumGrade={schoolConfig.academic.passingGrade}
      saved={saved}
    />
  );
}

function AttendanceTab({
  classroomId,
  assignments,
  activeSubjectId,
  activeSubjectName,
  classroomName,
  date,
  view,
  periods,
  historyFilters,
  sessions,
  selectedSession,
  students
}: {
  classroomId: string;
  assignments: Array<{ subjectId: string; subject: { id: string; name: string } }>;
  activeSubjectId: string;
  activeSubjectName: string;
  classroomName: string;
  date: string;
  view: "registrar" | "historico";
  periods: Array<{ id: string; name: string; startsAt: Date; endsAt: Date }>;
  historyFilters: { subjectId: string; periodId: string; startDate: string; endDate: string };
  sessions: AttendanceSession[];
  selectedSession: AttendanceSession | null;
  students: Array<{ enrollmentId: string; name: string; currentStatus?: AttendanceStatus }>;
}) {
  const baseRegisterParams = new URLSearchParams();
  baseRegisterParams.set("tab", "frequencia");
  baseRegisterParams.set("subjectId", activeSubjectId);
  baseRegisterParams.set("data", date);
  const registerHref = `/professor/turmas/${classroomId}?${baseRegisterParams.toString()}`;
  const historyHref = buildHistoryHref(classroomId, historyFilters);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-school-navy">Frequência</h2>
          <p className="text-sm text-text-secondary">Registre chamadas e consulte o histórico agrupado por aula.</p>
        </div>
        <div className="flex w-full gap-1 rounded-lg border border-border bg-surface-muted p-1 sm:w-fit">
          <Link
            href={registerHref}
            className={cn(
              "flex-1 rounded-md px-3.5 py-2 text-center text-sm font-medium text-text-secondary transition-colors sm:flex-none",
              view === "registrar" && "bg-school-primary text-white shadow-sm"
            )}
          >
            Registrar chamada
          </Link>
          <Link
            href={historyHref}
            className={cn(
              "flex-1 rounded-md px-3.5 py-2 text-center text-sm font-medium text-text-secondary transition-colors sm:flex-none",
              view === "historico" && "bg-school-primary text-white shadow-sm"
            )}
          >
            Histórico de chamadas
          </Link>
        </div>
      </div>

      {view === "registrar" ? (
        <>
          {assignments.length > 1 ? (
            <form
              className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-[220px_auto]"
              action={`/professor/turmas/${classroomId}`}
            >
              <input type="hidden" name="tab" value="frequencia" />
              <input type="hidden" name="freqView" value="registrar" />
              <input type="hidden" name="data" value={date} />
              <Select name="subjectId" defaultValue={activeSubjectId}>
                {assignments.map((assignment) => (
                  <option key={assignment.subjectId} value={assignment.subjectId}>
                    {assignment.subject.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">
                Trocar disciplina
              </Button>
            </form>
          ) : null}
          <AttendanceList
            classroomId={classroomId}
            subjectId={activeSubjectId}
            subjectName={activeSubjectName}
            classroomName={classroomName}
            students={students}
            defaultDate={date}
          />
        </>
      ) : (
        <div className="grid gap-4">
          <form
            className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 lg:grid-cols-[1fr_1fr_160px_160px_auto]"
            action={`/professor/turmas/${classroomId}`}
          >
            <input type="hidden" name="tab" value="frequencia" />
            <input type="hidden" name="freqView" value="historico" />
            {assignments.length > 1 ? (
              <Select name="historicoDisciplina" defaultValue={historyFilters.subjectId}>
                <option value="">Todas as disciplinas</option>
                {assignments.map((assignment) => (
                  <option key={assignment.subjectId} value={assignment.subjectId}>
                    {assignment.subject.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm text-text-primary">
                {activeSubjectName}
              </div>
            )}
            <Select name="periodoHistorico" defaultValue={historyFilters.periodId}>
              <option value="">Todos os períodos</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </Select>
            <input
              name="inicio"
              type="date"
              defaultValue={historyFilters.startDate}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-school-navy outline-none transition focus:border-school-primary focus:ring-2 focus:ring-school-primary-soft"
            />
            <input
              name="fim"
              type="date"
              defaultValue={historyFilters.endDate}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-school-navy outline-none transition focus:border-school-primary focus:ring-2 focus:ring-school-primary-soft"
            />
            <Button type="submit" variant="secondary">
              Filtrar histórico
            </Button>
          </form>

          {selectedSession ? (
            <div id="detalhe-chamada" className="scroll-mt-24 motion-safe:animate-[teacher-attendance-detail_160ms_ease-out]">
              <TeacherSection
                title={`Chamada selecionada — ${formatDate(selectedSession.date)}`}
                description={`${classroomName} · ${selectedSession.subjectName}`}
                action={
                  <Link
                    href={historyHref}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-school-primary-soft hover:text-school-primary"
                    aria-label="Fechar detalhe da chamada"
                  >
                    <X className="h-4 w-4" />
                    Fechar
                  </Link>
                }
              >
                <div className="grid gap-4">
                <p className="rounded-md bg-school-primary-soft px-3 py-2 text-sm font-medium text-school-navy">
                  {formatAttendanceSessionSummary(selectedSession)}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-success-soft p-3 text-sm">
                    <span className="text-text-secondary">Presentes</span>
                    <strong className="mt-1 block text-2xl text-success">{selectedSession.counts.PRESENT}</strong>
                  </div>
                  <div className="rounded-md bg-danger-soft p-3 text-sm">
                    <span className="text-text-secondary">Ausentes</span>
                    <strong className="mt-1 block text-2xl text-danger">{selectedSession.counts.ABSENT}</strong>
                  </div>
                  <div className="rounded-md bg-warning-soft p-3 text-sm">
                    <span className="text-text-secondary">Justificados</span>
                    <strong className="mt-1 block text-2xl text-warning">{selectedSession.counts.JUSTIFIED}</strong>
                  </div>
                </div>
                <div className="grid gap-2">
                  {selectedSession.students
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col gap-2 rounded-md bg-surface-muted p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-school-navy">{student.name}</span>
                        <Badge
                          variant={
                            student.status === "PRESENT"
                              ? "success"
                              : student.status === "ABSENT"
                                ? "danger"
                                : "warning"
                          }
                          className="w-fit"
                        >
                          {attendanceLabel(student.status)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
              </TeacherSection>
            </div>
          ) : null}

          <TeacherSection
            title="Histórico de chamadas"
            description={`Cada linha representa uma chamada completa por data e disciplina. ${sessions.length} chamada${
              sessions.length === 1 ? "" : "s"
            } exibida${sessions.length === 1 ? "" : "s"}.`}
          >
            <div className="teacher-table-wrap">
              <table className="teacher-table min-w-[860px]">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Disciplina</th>
                    <th>Presentes</th>
                    <th>Ausentes</th>
                    <th>Justificados</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length ? (
                    sessions.map((session) => {
                      const isSelected = selectedSession?.key === session.key;
                      return (
                      <tr
                        key={session.key}
                        className={cn(
                          isSelected && "bg-school-primary-soft/80 ring-1 ring-inset ring-school-primary/30"
                        )}
                      >
                        <td className="font-medium text-school-navy">{formatDate(session.date)}</td>
                        <td>{session.subjectName}</td>
                        <td>{session.counts.PRESENT}</td>
                        <td>{session.counts.ABSENT}</td>
                        <td>{session.counts.JUSTIFIED}</td>
                        <td>
                          <Link
                            href={buildHistoryHref(classroomId, historyFilters, { chamada: session.key })}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                              isSelected
                                ? "border-school-primary bg-school-primary text-white hover:bg-school-primary"
                                : "border-border bg-surface text-school-primary hover:bg-school-primary-soft"
                            )}
                            aria-current={isSelected ? "true" : undefined}
                          >
                            <Eye className="h-4 w-4" />
                            Ver chamada
                          </Link>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-text-secondary">
                        Nenhuma chamada encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TeacherSection>
        </div>
      )}
    </div>
  );
}
