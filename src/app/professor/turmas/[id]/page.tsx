import { notFound } from "next/navigation";
import { Clock, FilePenLine } from "lucide-react";
import { AttendanceList } from "@/components/teacher/attendance-list";
import { GradeTable } from "@/components/teacher/grade-table";
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
import { attendanceLabel, shiftLabel } from "@/lib/teacher-labels";
import { average, formatDate, formatPercent, gradeSituation } from "@/lib/utils";
import { getTeacherClassroomWorkspace } from "@/services/school-data";

export const dynamic = "force-dynamic";

const allowedTabs = ["resumo", "alunos", "notas", "frequencia"] as const;

export default async function TeacherClassroomPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; subjectId?: string; periodId?: string; data?: string; salvo?: string }>;
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

  const allGrades = classroom.enrollments.flatMap((enrollment) => enrollment.grades);
  const allAttendances = classroom.enrollments.flatMap((enrollment) => enrollment.attendances);
  const generalAverage = average(allGrades.map((grade) => grade.average));
  const attendanceRate = allAttendances.length
    ? (allAttendances.filter((attendance) => attendance.status === "PRESENT").length /
        allAttendances.length) *
      100
    : 0;
  const pendingRecords = classroom.enrollments.length * assignments.length * periods.length - allGrades.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
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

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <ClassTabs
          classroomId={classroom.id}
          activeTab={activeTab}
          subjectId={activeSubjectId}
          periodId={periodId}
        />
        <div className="p-4">
          {activeTab === "resumo" ? (
            <SummaryTab
              students={classroom.enrollments.length}
              averageGrade={generalAverage}
              attendanceRate={attendanceRate}
              pendingRecords={Math.max(0, pendingRecords)}
              recentGrades={allGrades.slice(0, 6)}
              recentAttendances={allAttendances.slice(0, 6)}
            />
          ) : null}

          {activeTab === "alunos" ? (
            <StudentsTab
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
                  situation: gradeSituation(gradeAverage, studentAttendance),
                  grades: enrollment.grades
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
              date={attendanceDate}
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
  recentGrades,
  recentAttendances
}: {
  students: number;
  averageGrade: number;
  attendanceRate: number;
  pendingRecords: number;
  recentGrades: Array<{ id: string; average: number; subject: { name: string }; academicPeriod: { name: string } }>;
  recentAttendances: Array<{ id: string; status: string; date: Date; subject: { name: string } }>;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetric label="Alunos" value={students} />
        <TeacherMetric label="Média geral" value={averageGrade.toFixed(1)} />
        <TeacherMetric label="Frequência média" value={formatPercent(attendanceRate)} />
        <TeacherMetric label="Registros pendentes" value={pendingRecords} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <TeacherSection title="Últimos lançamentos" className="lg:col-span-1">
          <div className="space-y-3">
            {recentGrades.length ? (
              recentGrades.map((grade) => (
                <div key={grade.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <strong>{grade.subject.name}</strong>
                  <p className="text-muted-foreground">
                    {grade.academicPeriod.name} · média {grade.average.toFixed(1)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma nota lançada ainda.</p>
            )}
          </div>
        </TeacherSection>

        <TeacherSection title="Próximas avaliações">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
              <FilePenLine className="h-4 w-4 text-primary" />
              <span>Revisar atividades do bimestre atual</span>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
              <Clock className="h-4 w-4 text-primary" />
              <span>Conferir lançamentos pendentes antes do fechamento</span>
            </div>
          </div>
        </TeacherSection>

        <TeacherSection title="Resumo de frequência">
          <div className="space-y-3">
            {recentAttendances.length ? (
              recentAttendances.map((attendance) => (
                <div key={attendance.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                  <span>
                    {formatDate(attendance.date)} · {attendance.subject.name}
                  </span>
                  <Badge>{attendanceLabel(attendance.status)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
            )}
          </div>
        </TeacherSection>
      </section>
    </div>
  );
}

function StudentsTab({
  enrollments
}: {
  enrollments: Array<{
    id: string;
    studentName: string;
    registration: string;
    average: number;
    attendance: number;
    situation: string;
    grades: Array<{ id: string; average: number; subject: { name: string }; academicPeriod: { name: string } }>;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matrícula</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Média atual</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequência</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Situação</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="border-t align-top">
                <td className="px-4 py-3">
                  <details>
                    <summary className="cursor-pointer font-medium text-primary">
                      {enrollment.studentName}
                    </summary>
                    <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-muted-foreground">
                      {enrollment.grades.slice(0, 6).map((grade) => (
                        <p key={grade.id}>
                          {grade.subject.name} · {grade.academicPeriod.name}: {grade.average.toFixed(1)}
                        </p>
                      ))}
                      {!enrollment.grades.length ? <p>Sem notas registradas nesta turma.</p> : null}
                    </div>
                  </details>
                </td>
                <td className="px-4 py-3">{enrollment.registration}</td>
                <td className="px-4 py-3 font-semibold">{enrollment.average.toFixed(1)}</td>
                <td className="px-4 py-3">{formatPercent(enrollment.attendance)}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={enrollment.situation} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradesTab({
  classroomId,
  assignments,
  periods,
  activeSubjectId,
  periodId,
  rows
}: {
  classroomId: string;
  assignments: Array<{ subjectId: string; subject: { id: string; name: string } }>;
  periods: Array<{ id: string; name: string }>;
  activeSubjectId: string;
  periodId: string;
  rows: Array<{ enrollmentId: string; studentName: string; av1: number; av2: number; assignment: number }>;
}) {
  const activeSubject = assignments.find((assignment) => assignment.subjectId === activeSubjectId) ?? assignments[0];

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Notas</h2>
        <p className="text-sm text-muted-foreground">
          Edite as avaliações diretamente na tabela. Os períodos vêm do banco de dados.
        </p>
      </div>
      <form className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[220px_220px_auto]" action={`/professor/turmas/${classroomId}`}>
        <input type="hidden" name="tab" value="notas" />
        {assignments.length > 1 ? (
          <Select name="subjectId" defaultValue={activeSubjectId}>
            {assignments.map((assignment) => (
              <option key={assignment.subjectId} value={assignment.subjectId}>
                {assignment.subject.name}
              </option>
            ))}
          </Select>
        ) : (
          <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm">
            {activeSubject.subject.name}
            <input type="hidden" name="subjectId" value={activeSubjectId} />
          </div>
        )}
        <Select name="periodId" defaultValue={periodId}>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">Aplicar filtros</Button>
      </form>
      <GradeTable classroomId={classroomId} subjectId={activeSubjectId} periodId={periodId} rows={rows} />
    </div>
  );
}

function AttendanceTab({
  classroomId,
  assignments,
  activeSubjectId,
  activeSubjectName,
  date,
  students
}: {
  classroomId: string;
  assignments: Array<{ subjectId: string; subject: { id: string; name: string } }>;
  activeSubjectId: string;
  activeSubjectName: string;
  date: string;
  students: Array<{ enrollmentId: string; name: string; currentStatus?: "PRESENT" | "ABSENT" | "JUSTIFIED" }>;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Frequência</h2>
        <p className="text-sm text-muted-foreground">
          Registre a chamada rapidamente durante a aula.
        </p>
      </div>
      {assignments.length > 1 ? (
        <form className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[220px_auto]" action={`/professor/turmas/${classroomId}`}>
          <input type="hidden" name="tab" value="frequencia" />
          <input type="hidden" name="data" value={date} />
          <Select name="subjectId" defaultValue={activeSubjectId}>
            {assignments.map((assignment) => (
              <option key={assignment.subjectId} value={assignment.subjectId}>
                {assignment.subject.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Trocar disciplina</Button>
        </form>
      ) : null}
      <AttendanceList
        classroomId={classroomId}
        subjectId={activeSubjectId}
        subjectName={activeSubjectName}
        students={students}
        defaultDate={date}
      />
    </div>
  );
}
