import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeacherPageHeader } from "@/components/teacher/teacher-ui";
import { requireSession } from "@/lib/auth";
import { audienceLabel } from "@/lib/teacher-labels";
import { cn, formatDate } from "@/lib/utils";
import { listAnnouncementsAdmin } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function ProfessorAnnouncementsPage({
  searchParams
}: {
  searchParams: Promise<{ comunicado?: string }>;
}) {
  const session = await requireSession(["PROFESSOR"]);
  const query = await searchParams;
  const announcements = await listAnnouncementsAdmin(session.schoolId);
  const selected =
    announcements.find((announcement) => announcement.id === query.comunicado) ?? announcements[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <TeacherPageHeader
        title="Comunicados"
        description="Central de avisos da escola para o corpo docente."
      />

      <section className="grid overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 lg:grid-cols-[360px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Lista de comunicados</h2>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {announcements.map((announcement, index) => {
              const active = selected?.id === announcement.id;
              return (
                <Link
                  key={announcement.id}
                  href={`/professor/comunicados?comunicado=${announcement.id}`}
                  className={cn(
                    "block border-b px-4 py-3 transition-colors hover:bg-slate-50",
                    active && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-2 h-2 w-2 rounded-full",
                        index < 2 ? "bg-primary" : "bg-slate-300"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-sm">{announcement.title}</strong>
                        {index < 2 ? <Badge variant="success">Novo</Badge> : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Secretaria · {formatDate(announcement.publishedAt)}
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {announcement.content}
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <article className="min-h-[420px] p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{audienceLabel(selected.audience)}</Badge>
                {selected.classroom ? <Badge>{selected.classroom.name}</Badge> : null}
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">{selected.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Secretaria · {formatDate(selected.publishedAt)}
              </p>
              <div className="mt-6 max-w-3xl text-sm leading-7 text-slate-700">
                {selected.content}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nenhum comunicado publicado.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
