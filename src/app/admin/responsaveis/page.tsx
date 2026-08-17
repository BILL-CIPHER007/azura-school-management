import Link from "next/link";
import { Search } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminToolbar, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireSession } from "@/lib/auth";
import { listGuardians } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardiansPage({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; parentesco?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const guardians = await listGuardians(session.schoolId, {
    search: params.busca,
    relation: params.parentesco
  });
  const relations = [...new Set(guardians.map((guardian) => guardian.relation))].sort();

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Responsáveis"
        description="Contatos, parentesco e alunos vinculados."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Responsáveis" }]}
        action={
          <Button asChild>
            <Link href="/admin/matriculas/nova">Cadastrar responsável</Link>
          </Button>
        }
      />

      <AdminToolbar>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input name="busca" placeholder="Buscar por nome" defaultValue={params.busca} className="pl-9" />
          </label>
          <Select name="parentesco" defaultValue={params.parentesco ?? ""}>
            <option value="">Todos os parentescos</option>
            {relations.map((relation) => (
              <option key={relation} value={relation}>
                {relation}
              </option>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>
      </AdminToolbar>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Parentesco</th>
                <th>Contato</th>
                <th>Alunos vinculados</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td>
                    <Link href={`/admin/responsaveis/${guardian.id}`} className="font-medium text-primary">
                      {guardian.fullName}
                    </Link>
                  </td>
                  <td>{guardian.relation}</td>
                  <td>
                    <span className="block">{guardian.email ?? "-"}</span>
                    <span className="text-xs text-muted-foreground">{guardian.phone ?? "-"}</span>
                  </td>
                  <td className="space-x-1">
                    {guardian.students.map((item) => (
                      <Badge key={item.studentId} variant={item.isPrimary ? "info" : "neutral"}>
                        {item.student.fullName}
                      </Badge>
                    ))}
                  </td>
                  <td>
                    <RowActions
                      items={[
                        { label: "Ver responsável", href: `/admin/responsaveis/${guardian.id}` },
                        { label: "Editar", disabled: true },
                        { label: "Ver alunos vinculados", href: `/admin/responsaveis/${guardian.id}#alunos` },
                        { label: "Vincular aluno", href: "/admin/matriculas/nova" }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!guardians.length ? (
          <div className="p-4">
            <AdminEmptyState title="Nenhum responsável encontrado" description="Ajuste a busca ou cadastre um novo vínculo." />
          </div>
        ) : null}
      </div>
    </main>
  );
}
