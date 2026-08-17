import Link from "next/link";
import { MailOpen, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentEmptyState, StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { compactText, studentAudienceLabel } from "@/lib/student-labels";
import { cn, formatDate } from "@/lib/utils";
import { getStudentPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentAnnouncementsPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const selected = portal.announcements.find((announcement) => announcement.id === id) ?? portal.announcements[0] ?? null;

  return (
    <main className="page-shell">
      <StudentPageHeader
        title="Comunicados"
        description="Avisos importantes enviados pela escola para alunos."
        eyebrow={portal.enrollment?.classroom.name}
      />

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <StudentSection title="Lista de comunicados" className="xl:min-h-[560px]">
          {portal.announcements.length ? (
            <div className="divide-y">
              {portal.announcements.map((announcement, index) => (
                <Link
                  key={announcement.id}
                  href={`/aluno/comunicados?id=${announcement.id}`}
                  className={cn(
                    "block py-3 first:pt-0 last:pb-0",
                    selected?.id === announcement.id && "text-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">{announcement.title}</p>
                        {index === 0 ? <Badge variant="success">Novo</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{compactText(announcement.content, 90)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Secretaria · {formatDate(announcement.publishedAt)}</p>
                    </div>
                    <MailOpen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <StudentEmptyState title="Nenhum comunicado" description="Os avisos destinados aos alunos aparecerão aqui." />
          )}
        </StudentSection>

        <StudentSection title="Conteúdo selecionado" className="xl:min-h-[560px]">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{studentAudienceLabel(selected.audience)}</Badge>
                {selected.classroom ? <Badge>{selected.classroom.name}</Badge> : null}
                <span className="text-sm text-muted-foreground">{formatDate(selected.publishedAt)}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">{selected.title}</h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                Secretaria
              </div>
              <p className="mt-6 whitespace-pre-line text-sm leading-6 text-slate-700">{selected.content}</p>
            </article>
          ) : (
            <StudentEmptyState title="Selecione um comunicado" description="A leitura completa aparecerá nesta área." />
          )}
        </StudentSection>
      </section>
    </main>
  );
}
