import { createSubject } from "@/app/actions/academic";
import { AdminPageHeader, AdminSection, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { listSubjects } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const session = await requireSession(["ADMIN"]);
  const subjects = await listSubjects(session.schoolId);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Disciplinas"
        description="Base curricular configurável por escola, com vínculos de professores e turmas."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Disciplinas" }]}
      />

      <AdminSection title="Nova disciplina" description="Cadastre uma disciplina com código curto e único.">
        <form action={createSubject} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <Input name="name" placeholder="Nova disciplina" required />
          <Input name="code" placeholder="Código" required />
          <Button type="submit">Cadastrar</Button>
        </form>
      </AdminSection>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Professores vinculados</th>
                <th>Turmas vinculadas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => {
                const teachers = [...new Set(subject.assignments.map((assignment) => assignment.teacher.fullName))];
                const classrooms = [...new Set(subject.assignments.map((assignment) => assignment.classroom.name))];
                return (
                  <tr key={subject.id}>
                    <td className="font-medium">{subject.name}</td>
                    <td>{subject.code}</td>
                    <td>{teachers.length ? teachers.join(", ") : "-"}</td>
                    <td>{classrooms.length ? classrooms.join(", ") : "-"}</td>
                    <td>
                      <Badge variant="success">Ativa</Badge>
                    </td>
                    <td>
                      <RowActions
                        items={[
                          { label: "Editar", disabled: true },
                          { label: "Vincular professores", href: "/admin/professores" },
                          { label: "Vincular turmas", href: "/admin/turmas" },
                          { label: "Desativar", disabled: true }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
