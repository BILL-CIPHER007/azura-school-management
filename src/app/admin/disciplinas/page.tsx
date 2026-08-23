import { createSubject } from "@/app/actions/academic";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { listSubjects } from "@/services/school-data";

export const dynamic = "force-dynamic";

const feedbackMessages: Record<string, { tone: "success" | "warning"; text: string }> = {
  "sucesso:cadastro": { tone: "success", text: "Disciplina cadastrada com sucesso." },
  "erro:codigo": { tone: "warning", text: "Já existe uma disciplina com este código." },
  "erro:nome": { tone: "warning", text: "Já existe uma disciplina com este nome." },
  "erro:validacao": { tone: "warning", text: "Informe nome e código válidos para cadastrar a disciplina." }
};

export default async function SubjectsPage({
  searchParams
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const subjects = await listSubjects(session.schoolId);
  const feedbackKey = params.sucesso ? `sucesso:${params.sucesso}` : params.erro ? `erro:${params.erro}` : "";
  const feedback = feedbackMessages[feedbackKey];

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

      {feedback ? (
        <div
          className={`rounded-lg border p-4 text-sm font-medium ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="table-wrap">
        {subjects.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Código</th>
                  <th>Professores vinculados</th>
                  <th>Turmas vinculadas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => {
                  const teachers = [
                    ...new Set(subject.assignments.map((assignment) => assignment.teacher.fullName))
                  ].sort((first, second) => first.localeCompare(second, "pt-BR"));
                  const classrooms = [
                    ...new Map(
                      subject.assignments.map((assignment) => [
                        assignment.classroomId,
                        assignment.classroom.name
                      ] as const)
                    ).values()
                  ];

                  return (
                    <tr key={subject.id}>
                      <td className="font-medium">{subject.name}</td>
                      <td>{subject.code}</td>
                      <td>{teachers.length ? teachers.join(", ") : "Nenhum professor vinculado"}</td>
                      <td>{classrooms.length ? classrooms.join(", ") : "Nenhuma turma vinculada"}</td>
                      <td>
                        <RowActions
                          items={[
                            { label: "Ver professores vinculados", href: `/admin/professores?disciplina=${subject.id}` }
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminEmptyState
              title="Nenhuma disciplina cadastrada"
              description="Cadastre a primeira disciplina para compor a base curricular da escola."
            />
          </div>
        )}
      </div>
    </main>
  );
}
