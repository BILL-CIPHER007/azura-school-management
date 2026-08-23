import Link from "next/link";
import { createGuardian } from "@/app/actions/academic";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewGuardianPage() {
  await requireSession(["ADMIN"]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Cadastrar responsável"
        description="Crie o cadastro do responsável antes ou depois de existir vínculo acadêmico com um aluno."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Responsáveis", href: "/admin/responsaveis" },
          { label: "Cadastrar responsável" }
        ]}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/responsaveis">Voltar</Link>
          </Button>
        }
      />

      <form action={createGuardian} className="grid gap-4">
        <AdminSection
          title="Dados do responsável"
          description="Informe os dados reais de contato. CPF ou e-mail já cadastrados levam ao cadastro existente."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="guardianName" placeholder="Nome completo" required />
            <Input name="relation" placeholder="Parentesco" required />
            <Input name="guardianCpf" placeholder="CPF" />
            <Input name="guardianPhone" placeholder="Telefone" />
            <Input name="guardianEmail" type="email" placeholder="E-mail" className="md:col-span-2" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit">Cadastrar responsável</Button>
          </div>
        </AdminSection>
      </form>
    </main>
  );
}
