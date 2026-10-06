import Link from "next/link";
import { Search } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { auditActionLabel, auditEntityLabel, auditSourceLabel, adminRoleLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { listInstitutionalAuditLogs } from "@/services/audit-log";

export const dynamic = "force-dynamic";

type AuditSearchParams = {
  pagina?: string;
  inicio?: string;
  fim?: string;
  usuario?: string;
  acao?: string;
  entidade?: string;
  origem?: string;
  entidadeId?: string;
};

function stringValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringValue).join(", ");
  return JSON.stringify(value);
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const fieldLabels: Record<string, string> = {
  av1: "AV1",
  av2: "AV2",
  assignment: "Trabalho",
  average: "Média",
  status: "Status",
  content: "Conteúdo",
  notes: "Observações",
  fullName: "Nome",
  cpf: "CPF",
  email: "E-mail",
  phone: "Telefone",
  closedAt: "Fechado em",
  isClosed: "Fechado",
  isActive: "Ativo",
  title: "Título",
  audience: "Público",
  classroomId: "Turma",
  subjectId: "Disciplina",
  studentName: "Aluno",
  documentType: "Documento"
};

function fieldLabel(value: string) {
  return fieldLabels[value] ?? value;
}

function AuditValueList({ value }: { value: unknown }) {
  const object = jsonObject(value);
  if (!object || !Object.keys(object).length) return <p className="text-sm text-text-muted">Sem dados registrados.</p>;

  return (
    <dl className="grid gap-2 text-sm">
      {Object.entries(object).map(([key, item]) => (
        <div key={key} className="grid gap-1 rounded-md border border-border bg-background p-2 sm:grid-cols-[150px_1fr]">
          <dt className="text-xs font-semibold uppercase text-text-muted">{fieldLabel(key)}</dt>
          <dd className="break-words font-medium text-text-primary">{stringValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

function buildHref(params: AuditSearchParams, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "pagina") continue;
    search.set(key, value);
  }
  if (page > 1) search.set("pagina", String(page));
  const suffix = search.toString();
  return suffix ? `/admin/configuracoes/auditoria?${suffix}` : "/admin/configuracoes/auditoria";
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<AuditSearchParams> }) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina ?? "1") || 1);
  const audit = await listInstitutionalAuditLogs(session.schoolId, {
    page,
    from: params.inicio,
    to: params.fim,
    userId: params.usuario,
    action: params.acao,
    entity: params.entidade,
    source: params.origem,
    entityId: params.entidadeId
  });

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Auditoria institucional"
        description="Consulte ações administrativas, acadêmicas e financeiras registradas no escopo da escola."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Configurações", href: "/admin/configuracoes" },
          { label: "Auditoria" }
        ]}
      />

      <AdminToolbar>
        <form className="grid gap-3 lg:grid-cols-4" action="/admin/configuracoes/auditoria">
          <Input type="date" name="inicio" defaultValue={params.inicio ?? ""} aria-label="Data inicial" />
          <Input type="date" name="fim" defaultValue={params.fim ?? ""} aria-label="Data final" />
          <Select name="usuario" defaultValue={params.usuario ?? ""} aria-label="Usuário">
            <option value="">Todos os usuários</option>
            {audit.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {adminRoleLabel(user.role)}
              </option>
            ))}
          </Select>
          <Select name="origem" defaultValue={params.origem ?? ""} aria-label="Origem">
            <option value="">Todas as origens</option>
            {audit.sources.map((source) => (
              <option key={source} value={source}>
                {auditSourceLabel(source)}
              </option>
            ))}
          </Select>
          <Select name="acao" defaultValue={params.acao ?? ""} aria-label="Ação">
            <option value="">Todas as ações</option>
            {audit.actions.map((action) => (
              <option key={action} value={action}>
                {auditActionLabel(action)}
              </option>
            ))}
          </Select>
          <Select name="entidade" defaultValue={params.entidade ?? ""} aria-label="Entidade">
            <option value="">Todas as entidades</option>
            {audit.entities.map((entity) => (
              <option key={entity} value={entity}>
                {auditEntityLabel(entity)}
              </option>
            ))}
          </Select>
          <Input name="entidadeId" defaultValue={params.entidadeId ?? ""} placeholder="Buscar por ID da entidade" />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Search className="h-4 w-4" />
              Filtrar
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/configuracoes/auditoria">Limpar</Link>
            </Button>
          </div>
        </form>
      </AdminToolbar>

      <AdminSection
        title="Eventos registrados"
        description={`${audit.total} registro${audit.total === 1 ? "" : "s"} encontrado${audit.total === 1 ? "" : "s"}.`}
      >
        {audit.logs.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data e hora</th>
                    <th>Usuário</th>
                    <th>Papel</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>Origem</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.createdAt)}</td>
                      <td>{log.user?.name ?? "Sistema"}</td>
                      <td>{log.actorRole ? adminRoleLabel(log.actorRole) : log.user?.role ? adminRoleLabel(log.user.role) : "Sistema"}</td>
                      <td className="font-medium text-school-navy">{auditActionLabel(log.action)}</td>
                      <td>
                        <div className="grid gap-1">
                          <span>{auditEntityLabel(log.entity)}</span>
                          <span className="font-mono text-xs text-text-muted">{log.entityId}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="info">{auditSourceLabel(log.source)}</Badge>
                      </td>
                      <td>
                        <details className="min-w-[240px] rounded-md border border-border bg-surface px-3 py-2">
                          <summary className="cursor-pointer text-xs font-semibold text-school-primary">Ver detalhes</summary>
                          <div className="mt-3 grid gap-3">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Antes</p>
                              <AuditValueList value={log.before} />
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Depois</p>
                              <AuditValueList value={log.after} />
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Metadata</p>
                              <AuditValueList value={log.metadata} />
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {audit.page} de {audit.pageCount}
              </span>
              <div className="flex gap-2">
                {audit.page <= 1 ? (
                  <Button variant="secondary" size="sm" disabled>
                    Anterior
                  </Button>
                ) : (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={buildHref(params, audit.page - 1)}>Anterior</Link>
                  </Button>
                )}
                {audit.page >= audit.pageCount ? (
                  <Button variant="secondary" size="sm" disabled>
                    Próxima
                  </Button>
                ) : (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={buildHref(params, audit.page + 1)}>Próxima</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <AdminEmptyState title="Nenhum evento encontrado" description="Ajuste os filtros para consultar outros registros de auditoria." />
        )}
      </AdminSection>
    </main>
  );
}
