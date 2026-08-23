import { AnnouncementForm } from "@/app/admin/comunicados/announcement-form";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { announcementScopeLabel } from "@/lib/announcements";
import { audienceLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { listAnnouncementsAdmin, listClassrooms } from "@/services/school-data";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  validacao: "Informe título, público e conteúdo válidos.",
  turma: "A turma selecionada não pertence à escola atual.",
  "turma-obrigatoria": "Selecione uma turma para publicar como turma específica."
};

export default async function AnnouncementsPage({
  searchParams
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const [announcements, classrooms] = await Promise.all([
    listAnnouncementsAdmin(session.schoolId),
    listClassrooms(session.schoolId)
  ]);
  const successMessage = query.sucesso === "publicado" ? "Comunicado publicado com sucesso." : null;
  const errorMessage = query.erro ? errorMessages[query.erro] ?? "Não foi possível publicar o comunicado." : null;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Comunicados"
        description="Publique avisos por público ou turma específica."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Comunicados" }]}
      />

      <AdminSection
        title="Novo comunicado"
        description="Mensagem publicada nos portais correspondentes ao público selecionado."
      >
        {successMessage || errorMessage ? (
          <div
            className={
              successMessage
                ? "mb-4 rounded-md border border-success/20 bg-success-soft px-3 py-2 text-sm font-medium text-success"
                : "mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            }
          >
            {successMessage ?? errorMessage}
          </div>
        ) : null}
        <AnnouncementForm classrooms={classrooms} />
      </AdminSection>

      <AdminSection title="Comunicados publicados">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Público</th>
                <th>Turma</th>
                <th>Publicado em</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td>
                    <strong>{announcement.title}</strong>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">{announcement.content}</p>
                  </td>
                  <td>
                    <Badge variant="info">{audienceLabel(announcement.audience)}</Badge>
                  </td>
                  <td>{announcementScopeLabel(announcement)}</td>
                  <td>{formatDate(announcement.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!announcements.length ? (
          <div className="p-4">
            <AdminEmptyState
              title="Nenhum comunicado publicado"
              description="Publique o primeiro comunicado para iniciar os avisos da escola."
            />
          </div>
        ) : null}
      </AdminSection>
    </main>
  );
}
