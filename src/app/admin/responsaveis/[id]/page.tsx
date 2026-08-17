import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMetric, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  enrollmentStatusLabel,
  enrollmentStatusTone,
  shiftLabel,
  userStatusLabel,
  userStatusTone
} from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getGuardianDetails } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardianDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const guardian = await getGuardianDetails(session.schoolId, id);
  if (!guardian) notFound();

  return (
    <main className="page-shell">
      <AdminPageHeader
        title={guardian.fullName}
        description="Dados de contato, parentesco e alunos vinculados."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Responsáveis", href: "/admin/responsaveis" },
          { label: guardian.fullName }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/responsaveis">Voltar</Link>
            </Button>
            <Button variant="secondary" disabled>Editar</Button>
            <Button asChild>
              <Link href="/admin/matriculas/nova">Vincular aluno</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AdminMetric label="Alunos vinculados" value={guardian.students.length} detail="vínculos ativos" />
        <AdminMetric label="Parentesco" value={guardian.relation} detail="cadastro" />
        <AdminMetric
          label="Usuário"
          value={guardian.user ? userStatusLabel(guardian.user.status) : "Sem acesso"}
          tone={guardian.user ? userStatusTone(guardian.user.status) : "neutral"}
        />
      </section>

      <AdminSection title="Dados de contato">
        <DefinitionList
          items={[
            { label: "CPF", value: guardian.cpf },
            { label: "E-mail", value: guardian.email },
            { label: "Telefone", value: guardian.phone },
            { label: "Criado em", value: formatDate(guardian.createdAt) }
          ]}
        />
      </AdminSection>

      <AdminSection id="alunos" title="Alunos vinculados" description="Detalhes dos vínculos com estudantes.">
        <div className="grid gap-3 md:grid-cols-2">
          {guardian.students.map((item) => {
            const enrollment = item.student.enrollments[0];
            return (
              <Link
                key={item.studentId}
                href={`/admin/alunos/${item.studentId}`}
                className="rounded-lg border p-4 hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{item.student.fullName}</strong>
                  {item.isPrimary ? <Badge variant="info">Responsável principal</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {enrollment
                    ? `${enrollment.classroom.name} · ${shiftLabel(enrollment.classroom.shift)} · ${enrollment.academicYear.year}`
                    : "Sem matrícula ativa"}
                </p>
                {enrollment ? (
                  <Badge className="mt-3" variant={enrollmentStatusTone(enrollment.status)}>
                    {enrollmentStatusLabel(enrollment.status)}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      </AdminSection>
    </main>
  );
}
