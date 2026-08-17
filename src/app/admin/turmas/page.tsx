import Link from "next/link";
import { PageHeader, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { average, formatPercent } from "@/lib/utils";
import { listClassrooms } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const session = await requireSession(["ADMIN"]);
  const classrooms = await listClassrooms(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Turmas" description="Ano letivo, turno, alunos, professores e desempenho." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {classrooms.map((classroom) => {
          const gradeAverage = average(
            classroom.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.average))
          );
          const attendanceValues = classroom.enrollments.flatMap((enrollment) =>
            enrollment.attendances.map((attendance) => attendance.status)
          );
          const attendance = attendanceValues.length
            ? (attendanceValues.filter((status) => status === "PRESENT").length /
                attendanceValues.length) *
              100
            : 0;
          return (
            <Link key={classroom.id} href={`/admin/turmas/${classroom.id}`}>
              <Card className="h-full transition-colors hover:bg-muted">
                <CardContent className="p-5">
                  <Badge variant="info">{classroom.academicYear.year}</Badge>
                  <h2 className="mt-4 text-xl font-semibold">{classroom.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {classroom.shift} · {classroom._count.enrollments} alunos
                  </p>
                  <p className="mt-4 text-sm">Média {gradeAverage.toFixed(1)}</p>
                  <ProgressBar value={attendance} className="mt-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Frequência {formatPercent(attendance)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
