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

export default async function GuardianDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existente?: string; sucesso?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const query = await searchParams;
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
          <Button asChild variant="outline">
            <Link href="/admin/responsaveis">Voltar</Link>
          </Button>
        }
      />

      {query.existente ? (
        <div className="rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
          CPF ou e-mail já identificavam este responsável. O cadastro existente foi aberto para evitar duplicidade.
        </div>
      ) : null}

      {query.sucesso === "cadastro" ? (
        <div className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          Responsável cadastrado com sucesso.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <AdminMetric label="Alunos vinculados" value={guardian.students.length} detail="vínculos reais" />
        <AdminMetric label="Parentesco" value={guardian.relation} detail="cadastro" />
        <AdminMetric
          label="Acesso ao portal"
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
                className="rounded-lg border border-border p-4 hover:bg-school-primary-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-school-navy">{item.student.fullName}</strong>
                  {item.isPrimary ? <Badge variant="info">Responsável principal</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-text-secondary">{guardian.relation}</p>
                <p className="mt-2 text-sm text-text-muted">
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
