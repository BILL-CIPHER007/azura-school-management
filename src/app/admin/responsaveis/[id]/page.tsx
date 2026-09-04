import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGuardian } from "@/app/actions/academic";
import { AdminMetric, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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

const errorMessages: Record<string, string> = {
  validacao: "Revise os dados informados.",
  cpf: "Informe um CPF válido com 11 dígitos ou deixe o campo vazio.",
  "cpf-duplicado": "Já existe outro responsável com este CPF nesta escola.",
  "email-duplicado": "Já existe outro responsável com este e-mail nesta escola.",
  "email-usuario": "Este e-mail já está vinculado a outro usuário da escola.",
  responsavel: "Responsável não encontrado nesta escola."
};

export default async function GuardianDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string; erro?: string; existente?: string; sucesso?: string }>;
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
          <>
            <Button asChild>
              <Link href={`/admin/responsaveis/${guardian.id}?editar=1`}>Editar responsável</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/responsaveis">Voltar</Link>
            </Button>
          </>
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

      {query.sucesso === "editado" ? (
        <div className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          Responsável atualizado com sucesso.
        </div>
      ) : null}

      {query.erro ? (
        <div className="rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          {errorMessages[query.erro] ?? "Não foi possível atualizar o responsável."}
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
            { label: "Nome", value: guardian.fullName },
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

      <Modal
        open={query.editar === "1"}
        title="Editar responsável"
        description="Atualize os dados cadastrais sem alterar alunos vinculados ou parentesco."
      >
        <form action={updateGuardian} className="grid gap-4">
          <input type="hidden" name="guardianId" value={guardian.id} />
          <Input name="guardianName" defaultValue={guardian.fullName} placeholder="Nome completo" required />
          <Input name="guardianCpf" defaultValue={guardian.cpf ?? ""} placeholder="CPF" />
          <Input name="guardianPhone" defaultValue={guardian.phone ?? ""} placeholder="Telefone" />
          <Input name="guardianEmail" type="email" defaultValue={guardian.email ?? ""} placeholder="E-mail" />
          <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text-secondary">
            Parentesco e alunos vinculados permanecem inalterados nesta edição.
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link href={`/admin/responsaveis/${guardian.id}`}>Cancelar</Link>
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
