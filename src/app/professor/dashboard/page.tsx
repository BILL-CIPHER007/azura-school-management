import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, GraduationCap, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeacherMetric, TeacherPageHeader, TeacherSection } from "@/components/teacher/teacher-ui";
import { announcementSenderName } from "@/lib/announcements";
import { requireSession } from "@/lib/auth";
import { audienceLabel, eventTypeLabel, firstName, lessonTime } from "@/lib/teacher-labels";
import { formatEventDateTime } from "@/lib/calendar-events";
import { cn, formatDate } from "@/lib/utils";
import { getTeacherHome } from "@/services/school-data";

export const dynamic = "force-dynamic";

function lessonWindow(index: number) {
  const [startLabel, endLabel] = lessonTime(index).split(" - ");
  const [startHour, startMinute] = startLabel.split(":").map(Number);
  const [endHour, endMinute] = endLabel.split(":").map(Number);
  const startsAt = new Date();
  startsAt.setHours(startHour, startMinute, 0, 0);
  const endsAt = new Date();
  endsAt.setHours(endHour, endMinute, 0, 0);
  return { startsAt, endsAt };
}

function featuredLessonId(lessons: Array<{ id: string; index: number }>) {
  const now = new Date();
  const current = lessons.find((lesson) => {
    const { startsAt, endsAt } = lessonWindow(lesson.index);
    return now >= startsAt && now <= endsAt;
  });
  if (current) return { id: current.id, label: "Agora" };

  const next = lessons.find((lesson) => {
    const { startsAt } = lessonWindow(lesson.index);
    return startsAt > now;
  });
  return next ? { id: next.id, label: "Próxima" } : null;
}

function lessonsHaveEnded(lessons: Array<{ index: number }>) {
  const now = new Date();
  return lessons.length > 0 && lessons.every((lesson) => lessonWindow(lesson.index).endsAt < now);
}

export default async function ProfessorDashboardPage() {
  const session = await requireSession(["PROFESSOR"]);
  const dashboard = await getTeacherHome(session.schoolId, session.id);
  const studentCount = dashboard.classrooms.reduce((sum, classroom) => sum + classroom.students, 0);
  const featuredLesson = featuredLessonId(dashboard.todayClasses);
  const dayLessonsEnded = !featuredLesson && lessonsHaveEnded(dashboard.todayClasses);
  const pendingMetric = (
    <TeacherMetric
      label="Pendências"
      value={dashboard.pendingActivities}
      detail={dashboard.pendingDetail}
      icon={CheckCircle2}
      tone={dashboard.pendingActivities ? "warning" : "success"}
    />
  );

  return (
    <main className="teacher-page">
      <TeacherPageHeader
        eyebrow={`Olá, ${firstName(dashboard.teacher.fullName)}!`}
        title="Resumo do seu dia"
        description="Acompanhe aulas, turmas, eventos e comunicados sem sair do fluxo de trabalho."
        action={
          <Button asChild>
            <Link href="/professor/turmas">
              Abrir minhas turmas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetric label="Turmas" value={dashboard.classrooms.length} icon={GraduationCap} />
        <TeacherMetric label="Alunos atendidos" value={studentCount} icon={UsersRound} />
        <TeacherMetric label="Disciplinas" value={dashboard.subjects.length} icon={BookOpen} />
        {dashboard.pendingActivities && dashboard.pendingHref ? (
          <Link
            href={dashboard.pendingHref}
            className="block rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            {pendingMetric}
          </Link>
        ) : (
          pendingMetric
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <TeacherSection title="Aulas de hoje" description="Atalhos rápidos para abrir a turma da aula.">
          <div className="space-y-3">
            <div className="divide-y divide-border">
              {dashboard.todayClasses.map((lesson) => {
                const lessonBadge = featuredLesson?.id === lesson.id ? featuredLesson.label : null;
                return (
                  <Link
                    key={lesson.id}
                    href={`/professor/turmas/${lesson.classroomId}`}
                    className={cn(
                      "grid gap-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-school-primary-soft/45 sm:grid-cols-[120px_1fr_auto] sm:items-center",
                      lessonBadge && "rounded-md bg-school-primary-soft/70 px-3 ring-1 ring-inset ring-school-primary/15"
                    )}
                  >
                    <span className="text-sm font-semibold text-school-primary">{lessonTime(lesson.index)}</span>
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="block text-sm text-school-navy">{lesson.classroomName}</strong>
                        {lessonBadge ? (
                          <Badge variant={lessonBadge === "Agora" ? "success" : "info"}>{lessonBadge}</Badge>
                        ) : null}
                      </span>
                      <span className="text-sm text-text-secondary">{lesson.subjectName}</span>
                    </span>
                    <span className="rounded-md bg-school-primary-soft px-2.5 py-1 text-sm font-medium text-school-primary">
                      {lesson.students} alunos
                    </span>
                  </Link>
                );
              })}
              {!dashboard.todayClasses.length ? (
                <div className="rounded-md bg-surface-muted p-3 text-sm">
                  <strong className="block text-school-navy">Nenhuma aula hoje</strong>
                  <p className="mt-1 text-text-secondary">Você não possui aulas programadas para este dia.</p>
                </div>
              ) : null}
            </div>
            {dayLessonsEnded ? (
              <div className="rounded-md bg-surface-muted px-4 py-3 text-sm text-text-secondary">
                <strong className="block text-school-navy">Aulas de hoje encerradas</strong>
                <span>Nenhuma aula está em andamento ou programada para mais tarde.</span>
              </div>
            ) : null}
          </div>
        </TeacherSection>

        <TeacherSection
          title="Minhas turmas"
          description="Acesse rapidamente as turmas mais recentes."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/professor/turmas">Ver todas</Link>
            </Button>
          }
        >
          <div className="grid gap-3">
            {dashboard.classrooms.slice(0, 3).map((classroom) => (
              <Link
                key={classroom.id}
                href={`/professor/turmas/${classroom.id}`}
                className="rounded-md border border-border p-3 transition-colors hover:bg-school-primary-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-school-navy">{classroom.name}</strong>
                    <p className="mt-1 truncate text-sm text-text-secondary">
                      {classroom.subjects.map((subject) => subject.name).join(", ")}
                    </p>
                  </div>
                  <Badge variant="info">{classroom.students} alunos</Badge>
                </div>
              </Link>
            ))}
          </div>
        </TeacherSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TeacherSection
          title="Próximos eventos"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/professor/calendario">Ver calendário</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {dashboard.events.slice(0, 4).map((event) => (
              <Link
                key={event.id}
                href="/professor/calendario"
                className="flex gap-3 rounded-md p-2 transition-colors hover:bg-school-primary-soft"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-school-primary-soft text-school-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-school-navy">{event.title}</strong>
                    <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                  </span>
                  <span className="text-sm text-text-secondary">{formatEventDateTime(event)}</span>
                </span>
              </Link>
            ))}
          </div>
        </TeacherSection>

        <TeacherSection
          title="Comunicados recentes"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/professor/comunicados">Ver todos</Link>
            </Button>
          }
        >
          <div className="divide-y divide-border">
            {dashboard.announcements.slice(0, 4).map((announcement) => (
              <Link
                key={announcement.id}
                href={`/professor/comunicados?comunicado=${announcement.id}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="mt-2 h-2 w-2 rounded-full bg-school-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong className="truncate text-sm text-school-navy">{announcement.title}</strong>
                  </span>
                  <span className="text-xs text-text-muted">
                    {announcementSenderName(announcement)} · {audienceLabel(announcement.audience)} ·{" "}
                    {formatDate(announcement.publishedAt)}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm text-text-secondary">{announcement.content}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted" />
              </Link>
            ))}
          </div>
        </TeacherSection>
      </section>
    </main>
  );
}
