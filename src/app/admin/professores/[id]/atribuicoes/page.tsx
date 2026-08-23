import Link from "next/link";
import { notFound } from "next/navigation";
import { createTeacherAssignment, removeTeacherAssignment } from "@/app/actions/academic";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { getTeacherAssignmentManager } from "@/services/school-data";

export const dynamic = "force-dynamic";

function feedbackMessage(params: { sucesso?: string; erro?: string }) {
  if (params.sucesso === "adicionada") return { tone: "success", text: "Atribuição adicionada com sucesso." };
  if (params.sucesso === "removida") return { tone: "success", text: "Atribuição removida com sucesso." };
  if (params.erro === "duplicada") return { tone: "warning", text: "Esta atribuição já existe." };
  if (params.erro === "historico") {
    return {
      tone: "warning",
      text: "Não é possível remover esta atribuição porque há notas ou chamadas vinculadas."
    };
  }
  return null;
}

export default async function TeacherAssignmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const query = await searchParams;
  const data = await getTeacherAssignmentManager(session.schoolId, id);
  if (!data) notFound();

  const { teacher, classrooms, subjects } = data;
  const returnTo = `/admin/professores/${teacher.id}/atribuicoes`;
  const message = feedbackMessage(query);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Gerenciar atribuições"
        description={`Professor fixo: ${teacher.fullName}. Adicione combinações de turma e disciplina.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Professores", href: "/admin/professores" },
          { label: teacher.fullName, href: `/admin/professores/${teacher.id}` },
          { label: "Atribuições" }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/professores/${teacher.id}`}>Voltar</Link>
            </Button>
          </>
        }
      />

      {message ? (
        <div
          className={`rounded-lg border p-4 text-sm font-medium ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <AdminSection title="Nova atribuição" description="Escolha a turma e a disciplina deste professor.">
        <form action={createTeacherAssignment} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="teacherId" value={teacher.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Select name="classroomId" required>
            <option value="">Selecione a turma</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} · {classroom.gradeLevel} · {shiftLabel(classroom.shift)}
              </option>
            ))}
          </Select>
          <Select name="subjectId" required>
            <option value="">Selecione a disciplina</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={!classrooms.length || !subjects.length}>
            Adicionar atribuição
          </Button>
        </form>
      </AdminSection>

      <AdminSection
        title="Atribuições atuais"
        description="Cada linha representa uma combinação única de professor, turma e disciplina."
      >
        {teacher.assignments.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Disciplina</th>
                  <th>Ano letivo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {teacher.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <Link href={`/admin/turmas/${assignment.classroomId}`} className="font-medium text-primary">
                        {assignment.classroom.name}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {assignment.classroom.gradeLevel} · {shiftLabel(assignment.classroom.shift)}
                      </p>
                    </td>
                    <td>
                      <Badge variant="info">{assignment.subject.name}</Badge>
                    </td>
                    <td>{assignment.classroom.academicYear.year}</td>
                    <td>
                      <form action={removeTeacherAssignment}>
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <ConfirmSubmitButton
                          message={`Remover a atribuição ${assignment.subject.name} - ${assignment.classroom.name} de ${teacher.fullName}?`}
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="Nenhuma atribuição cadastrada"
            description="Adicione uma turma e disciplina para este professor."
          />
        )}
      </AdminSection>
    </main>
  );
}
