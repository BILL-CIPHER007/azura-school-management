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
import { getClassroomAssignmentManager } from "@/services/school-data";

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

export default async function ClassroomAssignmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const query = await searchParams;
  const data = await getClassroomAssignmentManager(session.schoolId, id);
  if (!data) notFound();

  const { classroom, teachers, subjects } = data;
  const returnTo = `/admin/turmas/${classroom.id}/atribuicoes`;
  const message = feedbackMessage(query);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Gerenciar atribuições"
        description={`Turma fixa: ${classroom.name}. Adicione combinações de professor e disciplina.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Turmas", href: "/admin/turmas" },
          { label: classroom.name, href: `/admin/turmas/${classroom.id}` },
          { label: "Atribuições" }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/turmas/${classroom.id}?tab=professores`}>Voltar</Link>
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

      <AdminSection
        title="Nova atribuição"
        description={`${classroom.gradeLevel} · ${shiftLabel(classroom.shift)} · ${classroom.academicYear.year}`}
      >
        <form action={createTeacherAssignment} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="classroomId" value={classroom.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Select name="teacherId" required>
            <option value="">Selecione o professor</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName}
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
          <Button type="submit" disabled={!teachers.length || !subjects.length}>
            Adicionar atribuição
          </Button>
        </form>
      </AdminSection>

      <AdminSection
        title="Atribuições atuais"
        description="Cada linha representa uma combinação única de professor, turma e disciplina."
      >
        {classroom.assignments.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Professor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {classroom.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <Badge variant="info">{assignment.subject.name}</Badge>
                    </td>
                    <td>
                      <Link href={`/admin/professores/${assignment.teacherId}`} className="font-medium text-primary">
                        {assignment.teacher.fullName}
                      </Link>
                    </td>
                    <td>
                      <form action={removeTeacherAssignment}>
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <ConfirmSubmitButton
                          message={`Remover a atribuição ${assignment.subject.name} - ${classroom.name} de ${assignment.teacher.fullName}?`}
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
            description="Adicione professores e disciplinas para esta turma."
          />
        )}
      </AdminSection>
    </main>
  );
}
