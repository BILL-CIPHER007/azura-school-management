import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeacherPageHeader } from "@/components/teacher/teacher-ui";
import { announcementSenderName } from "@/lib/announcements";
import { requireSession } from "@/lib/auth";
import { audienceLabel } from "@/lib/teacher-labels";
import { cn, formatDate } from "@/lib/utils";
import { listTeacherAnnouncements } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ProfessorAnnouncementsPage({
  searchParams
}: {
  searchParams: Promise<{ comunicado?: string }>;
}) {
  const session = await requireSession(["PROFESSOR"]);
  const query = await searchParams;
  const announcements = await listTeacherAnnouncements(session.schoolId, session.id);
  const selected =
    announcements.find((announcement) => announcement.id === query.comunicado) ?? announcements[0] ?? null;

  return (
    <main className="teacher-page">
      <TeacherPageHeader title="Comunicados" description="Central de avisos da escola para o corpo docente." />

      <section className="grid overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-school-navy">Lista de comunicados</h2>
            <p className="mt-1 text-sm text-text-secondary">Avisos recentes e orientações institucionais.</p>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {announcements.map((announcement) => {
              const active = selected?.id === announcement.id;
              return (
                <Link
                  key={announcement.id}
                  href={`/professor/comunicados?comunicado=${announcement.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block border-b border-l-4 border-border border-l-transparent px-4 py-3 transition-colors hover:bg-school-primary-soft",
                    active && "border-l-school-primary bg-school-primary-soft"
                  )}
                >
                  <div className="min-w-0">
                    <strong className="truncate text-sm text-school-navy">{announcement.title}</strong>
                    <span className="mt-1 block text-xs text-text-muted">
                      {announcementSenderName(announcement)} · {formatDate(announcement.publishedAt)}
                    </span>
                    {announcement.classroom ? (
                      <span className="mt-1 block text-xs font-medium text-school-primary">
                        {announcement.classroom.name}
                      </span>
                    ) : null}
                    <span className="mt-1 line-clamp-2 text-sm text-text-secondary">{announcement.content}</span>
                  </div>
                </Link>
              );
            })}
            {!announcements.length ? (
              <div className="p-5 text-sm">
                <strong className="block text-school-navy">Nenhum comunicado disponível</strong>
                <p className="mt-1 text-text-secondary">Novos avisos da escola aparecerão aqui.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <article className="min-h-[420px] p-5 sm:p-6">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{audienceLabel(selected.audience)}</Badge>
                {selected.classroom ? <Badge>{selected.classroom.name}</Badge> : null}
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-school-navy">{selected.title}</h2>
              <p className="mt-2 text-sm text-text-muted">
                {announcementSenderName(selected)} · {formatDate(selected.publishedAt)}
              </p>
              <div className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-7 text-text-primary">
                {selected.content}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-school-primary-soft/50 p-6 text-center text-sm">
              <span>
                <strong className="block text-school-navy">Nenhum comunicado disponível</strong>
                <span className="mt-1 block text-text-secondary">Novos avisos da escola aparecerão aqui.</span>
              </span>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
