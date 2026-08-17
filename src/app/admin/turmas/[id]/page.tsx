import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMetric, AdminPageHeader, AdminSection, RowActions } from "@/components/admin/admin-ui";
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
  const attendance = attendanceValues.length
    ? (attendanceValues.filter((status) => status === "PRESENT").length / attendanceValues.length) * 100
    : 0;
  const students = classroom.enrollments.map((enrollment) => {
    const studentAverage = average(enrollment.grades.map((grade) => grade.average));
    const studentAttendance = enrollment.attendances.length
      ? (enrollment.attendances.filter((item) => item.status === "PRESENT").length / enrollment.attendances.length) *
        100
      : 0;
    return {
      enrollment,
      average: studentAverage,
      attendance: studentAttendance,
      situation: gradeSituation(studentAverage, studentAttendance)
    };
  });
  const subjectPerformance = [...new Set(classroom.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.subject.name)))].map((subjectName) => {
    const values = classroom.enrollments.flatMap((enrollment) =>
      enrollment.grades.filter((grade) => grade.subject.name === subjectName).map((grade) => grade.average)
    );
    return { subjectName, average: average(values), belowAverage: values.filter((value) => !isPassingGrade(value)).length };
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
            <Button variant="secondary" disabled>Editar turma</Button>
            <Button variant="secondary" disabled>Atribuir professor</Button>
            <Button variant="secondary" disabled>Gerenciar disciplinas</Button>
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
          <AdminMetric label="Ano letivo" value={classroom.academicYear.year} detail="ativo" />
        </section>
      ) : null}

      {activeTab === "alunos" ? (
        <AdminSection title="Alunos da turma">
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
        </AdminSection>
      ) : null}

      {activeTab === "professores" ? (
        <AdminSection title="Professores e disciplinas" description="Vínculos desta turma.">
          <div className="grid gap-3 md:grid-cols-2">
            {classroom.assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/admin/professores/${assignment.teacherId}`}
                className="rounded-lg border p-4 hover:bg-muted"
              >
                <strong>{assignment.teacher.fullName}</strong>
                <p className="text-sm text-muted-foreground">{assignment.subject.name}</p>
              </Link>
            ))}
          </div>
        </AdminSection>
      ) : null}

      {activeTab === "desempenho" ? (
        <AdminSection title="Desempenho da turma">
          <div className="grid gap-3">
            {subjectPerformance.map((subject) => (
              <div key={subject.subjectName} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{subject.subjectName}</strong>
                  <Badge variant="info">Média {subject.average.toFixed(1)}</Badge>
                </div>
                <ProgressBar value={subject.average * 10} className="mt-3" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {subject.belowAverage} registros abaixo da média mínima.
                </p>
              </div>
            ))}
          </div>
        </AdminSection>
      ) : null}

      {activeTab === "frequencia" ? (
        <AdminSection title="Frequência da turma">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg border p-4">
              <strong className="text-3xl">{formatPercent(attendance)}</strong>
              <ProgressBar value={attendance} className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">Frequência média registrada.</p>
            </div>
            <div className="grid gap-3">
              {students
                .sort((a, b) => a.attendance - b.attendance)
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
        </AdminSection>
      ) : null}
    </main>
  );
}
