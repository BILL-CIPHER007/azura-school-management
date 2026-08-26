import Link from "next/link";
import { ArrowRight, CalendarClock, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeacherPageHeader } from "@/components/teacher/teacher-ui";
import { requireSession } from "@/lib/auth";
import { nextLessonLabel, shiftLabel } from "@/lib/teacher-labels";
import { getTeacherClassrooms } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ProfessorClassroomsPage() {
  const session = await requireSession(["PROFESSOR"]);
  const classrooms = await getTeacherClassrooms(session.schoolId, session.id);

  return (
    <main className="teacher-page">
      <TeacherPageHeader
        title="Minhas turmas"
        description="Central de trabalho para consultar alunos, lançar notas e registrar frequência dentro de cada turma."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom, index) => (
          <Link
            key={classroom.id}
            href={`/professor/turmas/${classroom.id}`}
            className="group flex min-h-52 flex-col justify-between rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-school-blue-100 hover:bg-school-primary-soft/35"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-school-navy">{classroom.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">
                    {classroom.subjects.map((subject) => subject.name).join(", ")}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-school-primary" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-surface-muted p-3">
                  <p className="text-text-muted">Turno</p>
                  <strong className="mt-1 block text-school-navy">{shiftLabel(classroom.shift)}</strong>
                </div>
                <div className="rounded-md bg-surface-muted p-3">
                  <p className="text-text-muted">Alunos</p>
                  <strong className="mt-1 flex items-center gap-2 text-school-navy">
                    <UsersRound className="h-4 w-4 text-school-primary" />
                    {classroom.students}
                  </strong>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
                <p className="flex items-center gap-2 text-text-muted">
                  <CalendarClock className="h-4 w-4 text-school-primary" />
                  Próxima aula
                </p>
                <strong className="mt-1 block text-school-navy">{nextLessonLabel(index)}</strong>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button asChild size="sm">
                <span>Abrir turma</span>
              </Button>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
