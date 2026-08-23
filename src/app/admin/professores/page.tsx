import Link from "next/link";
import type { UserStatus } from "@prisma/client";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { Badge } from "@/components/ui/badge";
import { shiftLabel, userStatusLabel, userStatusTone } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { listSubjects, listTeachers } from "@/services/school-data";
import { AdminTeacherFilters } from "./admin-teacher-filters";

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
        <AdminTeacherFilters
          subjects={subjects}
          selectedSearch={params.busca}
          selectedSubject={params.disciplina}
          selectedStatus={params.status}
        />
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
                          { label: "Gerenciar atribuições", href: `/admin/professores/${teacher.id}/atribuicoes` }
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
            <AdminEmptyState
              title="Nenhum professor encontrado"
              description="Tente ajustar a busca ou os filtros selecionados."
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
