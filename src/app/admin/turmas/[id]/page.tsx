import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { academicSituationTone, shiftLabel } from "@/lib/admin-labels";
import { isAttendanceBelowMinimum, isPassingGrade } from "@/lib/academic-rules";
import { requireSession } from "@/lib/auth";
import { average, formatPercent, gradeSituation } from "@/lib/utils";
import { getClassroomDetails } from "@/services/school-data";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "resumo", label: "Resumo" },
  { id: "alunos", label: "Alunos" },
  { id: "professores", label: "Professores e Disciplinas" },
  { id: "desempenho", label: "Desempenho" },
  { id: "frequencia", label: "Frequência" }
] as const;

function calculateAttendanceRate(attendances: Array<{ status: string }>) {
  if (!attendances.length) return 0;
  const present = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  return (present / attendances.length) * 100;
}

function academicYearStatusLabel(academicYear: { startsAt: Date; endsAt: Date; isActive: boolean }) {
  const now = new Date();
  if (academicYear.isActive) return "ativo";
  if (academicYear.endsAt < now) return "encerrado";
  if (academicYear.startsAt > now) return "futuro";
  return "em andamento";
}

export default async function ClassroomDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const query = await searchParams;
  const classroom = await getClassroomDetails(session.schoolId, id);
  if (!classroom) notFound();

  const activeTab = tabs.some((tab) => tab.id === query.tab) ? query.tab ?? "resumo" : "resumo";
  const gradeAverage = average(
    classroom.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.average))
  );
  const attendanceValues = classroom.enrollments.flatMap((enrollment) =>
    enrollment.attendances.map((attendance) => attendance.status)
  );
  const attendance = calculateAttendanceRate(attendanceValues.map((status) => ({ status })));
  const hasAttendanceRecords = attendanceValues.length > 0;
  const academicYearEnded = classroom.academicYear.endsAt < new Date();
  const academicYearStatus = academicYearStatusLabel(classroom.academicYear);
  const students = classroom.enrollments.map((enrollment) => {
    const studentAverage = average(enrollment.grades.map((grade) => grade.average));
    const studentAttendance = calculateAttendanceRate(enrollment.attendances);
    return {
      enrollment,
      average: studentAverage,
      attendance: studentAttendance,
      situation: gradeSituation(studentAverage, studentAttendance, { isFinal: academicYearEnded })
    };
  });
  const sortedStudentsByAttendance = [...students].sort(
    (first, second) =>
      first.attendance - second.attendance ||
      first.enrollment.student.fullName.localeCompare(second.enrollment.student.fullName, "pt-BR")
  );
  const subjectPerformance = [
    ...new Map(
      classroom.enrollments
        .flatMap((enrollment) => enrollment.grades.map((grade) => [grade.subjectId, grade.subject] as const))
        .sort(([, first], [, second]) => first.name.localeCompare(second.name, "pt-BR"))
    ).entries()
  ].map(([subjectId, subject]) => {
    const studentAverages = classroom.enrollments
      .map((enrollment) => {
        const values = enrollment.grades
          .filter((grade) => grade.subjectId === subjectId)
          .map((grade) => grade.average);
        return values.length ? average(values) : null;
      })
      .filter((value): value is number => value !== null);

    return {
      subjectName: subject.name,
      average: average(studentAverages),
      belowAverage: studentAverages.filter((value) => !isPassingGrade(value)).length
    };
  });

  return (
    <main className="page-shell">
      <AdminPageHeader
        title={classroom.name}
        description={`${classroom.gradeLevel} · ${shiftLabel(classroom.shift)} · ${classroom.academicYear.year}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Turmas", href: "/admin/turmas" },
          { label: classroom.name }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/turmas">Voltar</Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/turmas/${classroom.id}/atribuicoes`}>Gerenciar atribuições</Link>
            </Button>
          </>
        }
      />

      <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/turmas/${classroom.id}?tab=${tab.id}`}
            className={`min-w-fit rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "resumo" ? (
        <section className="grid gap-3 md:grid-cols-5">
          <AdminMetric label="Alunos" value={classroom.enrollments.length} detail="matriculados" />
          <AdminMetric label="Média" value={gradeAverage.toFixed(1)} detail="geral da turma" />
          <AdminMetric label="Frequência" value={formatPercent(attendance)} detail="média registrada" />
          <AdminMetric label="Turno" value={shiftLabel(classroom.shift)} detail={classroom.gradeLevel} />
          <AdminMetric label="Ano letivo" value={classroom.academicYear.year} detail={academicYearStatus} />
        </section>
      ) : null}

      {activeTab === "alunos" ? (
        <AdminSection title="Alunos da turma">
          {students.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Matrícula</th>
                  <th>Média</th>
                  <th>Frequência</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {students.map((item) => (
                  <tr key={item.enrollment.id}>
                    <td>
                      <Link href={`/admin/alunos/${item.enrollment.studentId}`} className="font-medium text-primary">
                        {item.enrollment.student.fullName}
                      </Link>
                    </td>
                    <td>{item.enrollment.registration}</td>
                    <td>{item.average.toFixed(1)}</td>
                    <td>{formatPercent(item.attendance)}</td>
                    <td>
                      <Badge variant={academicSituationTone(item.situation)}>{item.situation}</Badge>
                    </td>
                    <td>
                      <RowActions items={[{ label: "Abrir perfil", href: `/admin/alunos/${item.enrollment.studentId}` }]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <AdminEmptyState
              title="Nenhum aluno matriculado"
              description="Esta turma ainda não possui matrículas ativas."
            />
          )}
        </AdminSection>
      ) : null}

      {activeTab === "professores" ? (
        <AdminSection
          title="Professores e disciplinas"
          description="Vínculos desta turma."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/turmas/${classroom.id}/atribuicoes`}>Gerenciar atribuições</Link>
            </Button>
          }
        >
          {classroom.assignments.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {classroom.assignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/admin/professores/${assignment.teacherId}`}
                  className="rounded-lg border p-4 hover:bg-muted"
                >
                  <strong>{assignment.subject.name}</strong>
                  <p className="text-sm text-muted-foreground">{assignment.teacher.fullName}</p>
                </Link>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="Nenhuma atribuição cadastrada"
              description="Adicione professores e disciplinas para esta turma."
            />
          )}
        </AdminSection>
      ) : null}

      {activeTab === "desempenho" ? (
        <AdminSection title="Desempenho da turma">
          {subjectPerformance.length ? (
          <div className="grid gap-3">
            {subjectPerformance.map((subject) => (
              <div key={subject.subjectName} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{subject.subjectName}</strong>
                  <Badge variant="info">Média {subject.average.toFixed(1)}</Badge>
                </div>
                <ProgressBar value={subject.average * 10} className="mt-3" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {subject.belowAverage} {subject.belowAverage === 1 ? "aluno" : "alunos"} abaixo da média mínima.
                </p>
              </div>
            ))}
          </div>
          ) : (
            <AdminEmptyState
              title="Nenhum dado de desempenho disponível"
              description="As médias aparecerão quando houver lançamentos de notas."
            />
          )}
        </AdminSection>
      ) : null}

      {activeTab === "frequencia" ? (
        <AdminSection title="Frequência da turma">
          {hasAttendanceRecords ? (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg border p-4">
              <strong className="text-3xl">{formatPercent(attendance)}</strong>
              <ProgressBar value={attendance} className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">Frequência média registrada.</p>
            </div>
            <div className="grid gap-3">
              {sortedStudentsByAttendance
                .slice(0, 8)
                .map((item) => (
                  <Link
                    key={item.enrollment.id}
                    href={`/admin/alunos/${item.enrollment.studentId}#frequencia`}
                    className="rounded-lg border p-3 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{item.enrollment.student.fullName}</strong>
                      <Badge variant={isAttendanceBelowMinimum(item.attendance) ? "warning" : "success"}>{formatPercent(item.attendance)}</Badge>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
          ) : (
            <AdminEmptyState
              title="Nenhum registro de frequência disponível"
              description="Os dados aparecerão quando houver chamadas registradas."
            />
          )}
        </AdminSection>
      ) : null}
    </main>
  );
}
