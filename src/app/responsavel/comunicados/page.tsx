import Link from "next/link";
import { Megaphone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { announcementSenderName } from "@/lib/announcements";
import { requireSession } from "@/lib/auth";
import { guardianAudienceLabel, guardianCompactText, guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { cn, formatDate } from "@/lib/utils";
import { getGuardianPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardianAnnouncementsPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string; id?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianPortal(session.schoolId, session.id, query.studentId);
  const announcements = [...portal.announcements].sort(
    (first, second) => second.publishedAt.getTime() - first.publishedAt.getTime()
  );
  const selected = announcements.find((announcement) => announcement.id === query.id) ?? announcements[0] ?? null;
  const studentId = portal.selectedStudent?.id ?? "";
  const classroom = portal.enrollment?.classroom;

  function announcementHref(announcementId: string) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    params.set("id", announcementId);
    return `/responsavel/comunicados?${params.toString()}`;
  }

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Comunicados"
          description={`Avisos relevantes para o acompanhamento de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <GuardianSection title="Lista de comunicados" className="xl:min-h-[560px]" bodyClassName="p-3">
          {announcements.length ? (
            <div className="space-y-2">
              {announcements.map((announcement) => (
                <Link
                  key={announcement.id}
                  href={announcementHref(announcement.id)}
                  aria-current={selected?.id === announcement.id ? "page" : undefined}
                  className={cn(
                    "block rounded-lg border border-transparent p-3 transition-colors",
                    selected?.id === announcement.id
                      ? "border-school-primary bg-school-primary-soft shadow-sm"
                      : "hover:border-border hover:bg-surface-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-school-navy">{announcement.title}</p>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">{guardianCompactText(announcement.content, 90)}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        {announcementSenderName(announcement)} · {formatDate(announcement.publishedAt)}
                      </p>
                    </div>
                    <Megaphone className="mt-1 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum comunicado disponível" description="Novos avisos da escola aparecerão aqui." />
          )}
        </GuardianSection>

        <GuardianSection title="Conteúdo selecionado" className="xl:min-h-[560px]">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{guardianAudienceLabel(selected.audience)}</Badge>
                {selected.classroom ? <Badge>{selected.classroom.name}</Badge> : null}
                <span className="text-sm text-text-muted">{formatDate(selected.publishedAt)}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-school-navy">{selected.title}</h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 text-school-primary" />
                {announcementSenderName(selected)}
              </div>
              <p className="mt-6 whitespace-pre-line text-sm leading-7 text-text-primary">{selected.content}</p>
            </article>
          ) : (
            <GuardianEmptyState title="Nenhum comunicado disponível" description="Novos avisos da escola aparecerão aqui." />
          )}
        </GuardianSection>
      </section>
    </main>
  );
}
