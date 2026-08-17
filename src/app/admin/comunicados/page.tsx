import { createAnnouncement } from "@/app/actions/academic";
import { AdminPageHeader, AdminSection, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { audienceLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { listAnnouncementsAdmin, listClassrooms } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const session = await requireSession(["ADMIN"]);
  const [announcements, classrooms] = await Promise.all([
    listAnnouncementsAdmin(session.schoolId),
    listClassrooms(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Comunicados"
        description="Publique avisos por público ou turma específica."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Comunicados" }]}
      />

      <AdminSection title="Novo comunicado" description="Mensagem publicada nos portais correspondentes ao público selecionado.">
        <form action={createAnnouncement} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <Input name="title" placeholder="Título" required />
            <Select name="audience" defaultValue="SCHOOL">
              <option value="SCHOOL">Toda a escola</option>
              <option value="PROFESSORS">Professores</option>
              <option value="STUDENTS">Alunos</option>
              <option value="GUARDIANS">Responsáveis</option>
              <option value="CLASSROOM">Turma específica</option>
            </Select>
            <Select name="classroomId" defaultValue="">
              <option value="">Sem turma</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </Select>
          </div>
          <Textarea name="content" placeholder="Conteúdo do comunicado" required />
          <Button type="submit" className="w-fit">Publicar comunicado</Button>
        </form>
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
                <th>Status</th>
                <th>Ações</th>
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
                  <td>{announcement.classroom?.name ?? "-"}</td>
                  <td>{formatDate(announcement.publishedAt)}</td>
                  <td>
                    <Badge variant="success">Publicado</Badge>
                  </td>
                  <td>
                    <RowActions
                      items={[
                        { label: "Visualizar", disabled: true },
                        { label: "Editar", disabled: true },
                        { label: "Excluir", disabled: true },
                        { label: "Republicar", disabled: true }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </main>
  );
}
