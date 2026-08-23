import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { average, formatPercent } from "@/lib/utils";
import { listClassrooms } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const session = await requireSession(["ADMIN"]);
  const classrooms = await listClassrooms(session.schoolId);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Turmas"
        description="Ano letivo, turno, alunos, professores, desempenho e frequência."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Turmas" }]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {classrooms.map((classroom) => {
          const gradeAverage = average(
            classroom.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.average))
          );
          const attendanceValues = classroom.enrollments.flatMap((enrollment) =>
            enrollment.attendances.map((attendance) => attendance.status)
          );
          const attendance = attendanceValues.length
            ? (attendanceValues.filter((status) => status === "PRESENT").length / attendanceValues.length) * 100
            : 0;
          const teachers = [...new Set(classroom.assignments.map((assignment) => assignment.teacher.fullName))];

          return (
            <Card key={classroom.id} className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="info">{classroom.academicYear.year}</Badge>
                  <span className="text-xs text-muted-foreground">{shiftLabel(classroom.shift)}</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{classroom.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {classroom.gradeLevel} · {classroom.enrollments.length} alunos
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {teachers.length} professores · {classroom.assignments.length} vínculos
                </p>
                <p className="mt-4 text-sm">Média {gradeAverage.toFixed(1)}</p>
                <ProgressBar value={attendance} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">Frequência {formatPercent(attendance)}</p>
                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link href={`/admin/turmas/${classroom.id}`}>Abrir turma</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
