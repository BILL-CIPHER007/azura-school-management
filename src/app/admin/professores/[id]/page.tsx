import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMetric, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shiftLabel, userStatusLabel, userStatusTone } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getTeacherDetails } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function TeacherDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const teacher = await getTeacherDetails(session.schoolId, id);
  if (!teacher) notFound();

  const subjects = [...new Set(teacher.assignments.map((assignment) => assignment.subject.name))];
  const classrooms = [...new Set(teacher.assignments.map((assignment) => assignment.classroom.name))];

  return (
    <main className="page-shell">
      <AdminPageHeader
        title={teacher.fullName}
        description="Dados básicos, disciplinas, turmas e status do professor."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Professores", href: "/admin/professores" },
          { label: teacher.fullName }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/professores">Voltar</Link>
            </Button>
            <Button variant="secondary" disabled>Editar</Button>
            <Button variant="secondary" disabled>Ativar/Desativar</Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <AdminMetric label="Disciplinas" value={subjects.length} detail="vinculadas" />
        <AdminMetric label="Turmas" value={classrooms.length} detail="ativas" />
        <AdminMetric label="Vínculos" value={teacher.assignments.length} detail="professor/turma" />
        <AdminMetric label="Status" value={userStatusLabel(teacher.status)} tone={userStatusTone(teacher.status)} />
      </section>

      <AdminSection title="Dados básicos">
        <DefinitionList
          items={[
            { label: "E-mail", value: teacher.email },
            { label: "Telefone", value: teacher.phone },
            { label: "Usuário", value: teacher.user?.email },
            { label: "Criado em", value: formatDate(teacher.createdAt) }
          ]}
        />
      </AdminSection>

      <AdminSection id="vinculos" title="Turmas e disciplinas" description="Relacionamentos atuais do professor.">
        <div className="grid gap-3 md:grid-cols-2">
          {teacher.assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/admin/turmas/${assignment.classroomId}`}
              className="rounded-lg border p-4 hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{assignment.classroom.name}</strong>
                <Badge>{assignment.subject.name}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {assignment.classroom.gradeLevel} · {shiftLabel(assignment.classroom.shift)}
              </p>
            </Link>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Histórico simples">
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Cadastro criado em {formatDate(teacher.createdAt)}. Última atualização em {formatDate(teacher.updatedAt)}.
        </div>
      </AdminSection>
    </main>
  );
}
