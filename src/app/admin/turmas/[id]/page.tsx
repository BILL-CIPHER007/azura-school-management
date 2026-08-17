import { notFound } from "next/navigation";
import { PageHeader, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { average, formatPercent } from "@/lib/utils";
import { getClassroomDetails } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ClassroomDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const classroom = await getClassroomDetails(session.schoolId, id);
  if (!classroom) notFound();

  const gradeAverage = average(
    classroom.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.average))
  );
  const attendanceValues = classroom.enrollments.flatMap((enrollment) =>
    enrollment.attendances.map((attendance) => attendance.status)
  );
  const attendance = attendanceValues.length
    ? (attendanceValues.filter((status) => status === "PRESENT").length / attendanceValues.length) * 100
    : 0;

  return (
    <main className="page-shell">
      <PageHeader
        title={classroom.name}
        description={`${classroom.gradeLevel} · ${classroom.shift} · ${classroom.academicYear.year}`}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Alunos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{classroom.enrollments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desempenho médio</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{gradeAverage.toFixed(1)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-3xl">{formatPercent(attendance)}</strong>
            <ProgressBar value={attendance} className="mt-2" />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Professores e disciplinas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {classroom.assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{assignment.teacher.fullName}</span>
                <Badge>{assignment.subject.name}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alunos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {classroom.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-md border p-3 text-sm">
                {enrollment.student.fullName}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
