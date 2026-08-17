import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <TeacherPageHeader
        title="Minhas turmas"
        description="Central de trabalho para consultar alunos, lançar notas e registrar frequência."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom, index) => (
          <Link
            key={classroom.id}
            href={`/professor/turmas/${classroom.id}`}
            className="group flex min-h-52 flex-col justify-between rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-primary/30"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{classroom.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {classroom.subjects.map((subject) => subject.name).join(", ")}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Turno</p>
                  <strong>{shiftLabel(classroom.shift)}</strong>
                </div>
                <div>
                  <p className="text-muted-foreground">Alunos</p>
                  <strong>{classroom.students}</strong>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
                <p className="text-muted-foreground">Próxima aula</p>
                <strong>{nextLessonLabel(index)}</strong>
              </div>
            </div>

            <Button asChild className="mt-5 w-fit">
              <span>Abrir turma</span>
            </Button>
          </Link>
        ))}
      </section>
    </main>
  );
}
