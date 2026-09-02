import { EnrollmentForm } from "@/app/admin/matriculas/nova/enrollment-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { getEnrollmentOptions } from "@/services/school-data";

export const dynamic = "force-dynamic";

const steps = ["Dados do aluno", "Responsável", "Informações acadêmicas", "Revisão"];

const errorMessages: Record<string, string> = {
  "turma-ano": "A turma selecionada não pertence ao ano letivo informado.",
  "matricula-ativa": "Este aluno já possui matrícula ativa neste ano letivo.",
  "aluno-existente": "Já existe um aluno cadastrado com este CPF ou e-mail. Revise os dados antes de continuar.",
  "email-aluno": "Este e-mail já está vinculado a outro usuário da escola.",
  "limite-alunos-ativos":
    "O limite de alunos ativos do plano atual foi atingido. Revise matrículas ativas ou altere o plano antes de cadastrar outro aluno."
};

export default async function NewEnrollmentPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const { guardians, classrooms, academicYears } = await getEnrollmentOptions(session.schoolId);
  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Nova matrícula"
        description="Cadastre aluno, responsável e vínculo acadêmico em um fluxo único."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Matrículas", href: "/admin/matriculas" },
          { label: "Nova matrícula" }
        ]}
      />

      {errorMessage ? (
        <div className="rounded-lg border border-warning/20 bg-warning-soft p-4 text-sm text-warning">
          <Badge variant="warning">Atenção</Badge>
          <p className="mt-2 font-medium">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-md bg-muted/50 p-3 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <span className="font-medium">{step}</span>
          </div>
        ))}
      </div>

      <EnrollmentForm
        guardians={guardians}
        classrooms={classrooms}
        academicYears={academicYears}
        defaultEnrollmentDate={schoolConfig.academic.defaultEnrollmentDate}
      />
    </main>
  );
}
