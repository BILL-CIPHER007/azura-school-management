import Link from "next/link";
import type { UserStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminToolbar, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { shiftLabel, userStatusLabel, userStatusTone } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { listSubjects, listTeachers } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function TeachersPage({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; disciplina?: string; status?: UserStatus }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const [teachers, subjects] = await Promise.all([
    listTeachers(session.schoolId, {
      search: params.busca,
      subjectId: params.disciplina,
      status: params.status
    }),
    listSubjects(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Professores"
        description="Equipe docente, disciplinas, turmas e status operacional."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Professores" }]}
      />

      <AdminToolbar>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_160px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input name="busca" placeholder="Buscar por nome" defaultValue={params.busca} className="pl-9" />
          </label>
          <Select name="disciplina" defaultValue={params.disciplina ?? ""}>
            <option value="">Todas as disciplinas</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>
      </AdminToolbar>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Disciplinas</th>
                <th>Turmas</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => {
                const teacherSubjects = [...new Set(teacher.assignments.map((item) => item.subject.name))];
                const teacherClassrooms = [...new Set(teacher.assignments.map((item) => `${item.classroom.name} (${shiftLabel(item.classroom.shift)})`))];
                return (
                  <tr key={teacher.id}>
                    <td>
                      <Link className="font-medium text-primary" href={`/admin/professores/${teacher.id}`}>
                        {teacher.fullName}
                      </Link>
                    </td>
                    <td>{teacherSubjects.join(", ") || "-"}</td>
                    <td>{teacherClassrooms.join(", ") || "-"}</td>
                    <td>{teacher.email ?? "-"}</td>
                    <td>
                      <Badge variant={userStatusTone(teacher.status)}>{userStatusLabel(teacher.status)}</Badge>
                    </td>
                    <td>
                      <RowActions
                        items={[
                          { label: "Ver professor", href: `/admin/professores/${teacher.id}` },
                          { label: "Editar", disabled: true },
                          { label: "Atribuir disciplinas", href: `/admin/professores/${teacher.id}#vinculos` },
                          { label: "Atribuir turmas", href: `/admin/professores/${teacher.id}#vinculos` },
                          { label: "Ativar/Desativar", disabled: true }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!teachers.length ? (
          <div className="p-4">
            <AdminEmptyState title="Nenhum professor encontrado" description="Ajuste os filtros para encontrar a equipe docente." />
          </div>
        ) : null}
      </div>
    </main>
  );
}
