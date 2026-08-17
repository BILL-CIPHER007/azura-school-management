import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TeacherMetric,
  TeacherPageHeader,
  TeacherSection
} from "@/components/teacher/teacher-ui";
import { requireSession } from "@/lib/auth";
import { audienceLabel, eventTypeLabel, firstName, lessonTime } from "@/lib/teacher-labels";
import { formatDate } from "@/lib/utils";
import { getTeacherHome } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ProfessorDashboardPage() {
  const session = await requireSession(["PROFESSOR"]);
  const dashboard = await getTeacherHome(session.schoolId, session.id);
  const studentCount = dashboard.classrooms.reduce((sum, classroom) => sum + classroom.students, 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <TeacherPageHeader
        eyebrow={`Olá, ${firstName(dashboard.teacher.fullName)}!`}
        title="Aqui está um resumo do seu dia."
        description="Acompanhe aulas, turmas, eventos e comunicados sem sair do fluxo de trabalho."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetric label="Turmas" value={dashboard.classrooms.length} />
        <TeacherMetric label="Alunos atendidos" value={studentCount} />
        <TeacherMetric label="Disciplinas" value={dashboard.subjects.length} />
        <TeacherMetric label="Pendências" value={dashboard.pendingActivities} detail="lançamentos para revisar" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TeacherSection title="Aulas de hoje">
          <div className="divide-y">
            {dashboard.todayClasses.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/professor/turmas/${lesson.classroomId}`}
                className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <span className="text-sm font-semibold text-primary">{lessonTime(lesson.index)}</span>
                <span>
                  <strong className="block text-sm">{lesson.classroomName}</strong>
                  <span className="text-sm text-muted-foreground">{lesson.subjectName}</span>
                </span>
                <span className="text-sm text-muted-foreground">{lesson.students} alunos</span>
              </Link>
            ))}
          </div>
        </TeacherSection>

        <TeacherSection
          title="Minhas turmas"
          action={
            <Link href="/professor/turmas" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          <div className="grid gap-3">
            {dashboard.classrooms.slice(0, 3).map((classroom) => (
              <div key={classroom.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block">{classroom.name}</strong>
                    <p className="text-sm text-muted-foreground">
                      {classroom.subjects.map((subject) => subject.name).join(", ")} · {classroom.students} alunos
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/professor/turmas/${classroom.id}`}>Abrir turma</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TeacherSection>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <TeacherSection
          title="Próximos eventos"
          action={
            <Link href="/professor/calendario" className="text-sm font-medium text-primary hover:underline">
              Ver calendário
            </Link>
          }
        >
          <div className="space-y-3">
            {dashboard.events.slice(0, 4).map((event) => (
              <Link key={event.id} href="/professor/calendario" className="flex gap-3 rounded-md p-2 hover:bg-muted">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{event.title}</strong>
                    <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </TeacherSection>

        <TeacherSection
          title="Comunicados recentes"
          action={
            <Link href="/professor/comunicados" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          }
        >
          <div className="divide-y">
            {dashboard.announcements.slice(0, 4).map((announcement, index) => (
              <Link
                key={announcement.id}
                href={`/professor/comunicados?comunicado=${announcement.id}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="mt-2 h-2 w-2 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong className="truncate text-sm">{announcement.title}</strong>
                    {index === 0 ? <Badge variant="success">Novo</Badge> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Secretaria · {audienceLabel(announcement.audience)} · {formatDate(announcement.publishedAt)}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {announcement.content}
                  </span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </TeacherSection>
      </section>
    </main>
  );
}
