import { createAnnouncement } from "@/app/actions/academic";
import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      <PageHeader title="Comunicados" description="Publique avisos por público ou turma específica." />
      <form action={createAnnouncement} className="grid gap-3 rounded-lg border bg-card p-4">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{announcement.title}</CardTitle>
                <Badge variant="info">{announcement.audience}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{announcement.content}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {formatDate(announcement.publishedAt)}
                {announcement.classroom ? ` · ${announcement.classroom.name}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
