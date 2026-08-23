import Link from "next/link";
import { AdminGuardianFilters } from "@/app/admin/responsaveis/admin-guardian-filters";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { listGuardianRelations, listGuardians } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardiansPage({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; parentesco?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const [guardians, relations] = await Promise.all([
    listGuardians(session.schoolId, {
      search: params.busca,
      relation: params.parentesco
    }),
    listGuardianRelations(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Responsáveis"
        description="Contatos, parentesco e alunos vinculados."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Responsáveis" }]}
        action={
          <Button asChild>
            <Link href="/admin/responsaveis/novo">Cadastrar responsável</Link>
          </Button>
        }
      />

      <AdminToolbar>
        <AdminGuardianFilters
          relations={relations}
          selectedSearch={params.busca}
          selectedRelation={params.parentesco}
        />
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
                    <span className="text-xs text-text-muted">{guardian.phone ?? "-"}</span>
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
                        { label: "Ver alunos vinculados", href: `/admin/responsaveis/${guardian.id}#alunos` }
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
            <AdminEmptyState
              title="Nenhum responsável encontrado"
              description="Tente ajustar a busca ou os filtros selecionados."
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
