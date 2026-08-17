import Link from "next/link";
import { MailOpen, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
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
  const selected = portal.announcements.find((announcement) => announcement.id === query.id) ?? portal.announcements[0] ?? null;
  const studentId = portal.selectedStudent?.id ?? "";
  const classroom = portal.enrollment?.classroom;

  return (
    <main className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GuardianPageHeader
          title="Comunicados"
          description={`Avisos relevantes para o acompanhamento de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")}.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <GuardianSection title="Lista de comunicados" className="xl:min-h-[560px]">
          {portal.announcements.length ? (
            <div className="divide-y">
              {portal.announcements.map((announcement, index) => (
                <Link
                  key={announcement.id}
                  href={`/responsavel/comunicados?studentId=${studentId}&id=${announcement.id}`}
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
                      <p className="mt-1 text-sm text-muted-foreground">{guardianCompactText(announcement.content, 90)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Secretaria · {formatDate(announcement.publishedAt)}</p>
                    </div>
                    <MailOpen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <GuardianEmptyState title="Nenhum comunicado" description="Os avisos relevantes para responsáveis aparecerão aqui." />
          )}
        </GuardianSection>

        <GuardianSection title="Conteúdo selecionado" className="xl:min-h-[560px]">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{guardianAudienceLabel(selected.audience)}</Badge>
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
            <GuardianEmptyState title="Selecione um comunicado" description="A leitura completa aparecerá nesta área." />
          )}
        </GuardianSection>
      </section>
    </main>
  );
}
