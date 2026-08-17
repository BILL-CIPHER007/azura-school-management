import { AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { auditActionLabel, auditEntityLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getSchoolSettings } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession(["ADMIN"]);
  const settings = await getSchoolSettings(session.schoolId);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Configurações"
        description="Escola, ano letivo, regras acadêmicas e auditoria básica."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Configurações" }]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminSection title="Escola" description="Dados da instalação atual e camada de personalização.">
          <DefinitionList
            items={[
              { label: "Nome no banco", value: settings.school.name },
              { label: "Nome configurado", value: schoolConfig.name },
              { label: "Nome curto", value: schoolConfig.shortName },
              { label: "Sigla", value: schoolConfig.initials },
              { label: "Slug", value: settings.school.slug }
            ]}
          />
        </AdminSection>

        <AdminSection title="Regras acadêmicas" description="Valores de leitura vindos da configuração central.">
          <DefinitionList
            items={[
              { label: "Ano letivo padrão", value: schoolConfig.academic.academicYear },
              { label: "Sistema de períodos", value: schoolConfig.academic.gradingSystem },
              { label: "Média mínima", value: schoolConfig.academic.passingGrade.toFixed(1) },
              { label: "Nota de recuperação", value: schoolConfig.academic.recoveryGrade.toFixed(1) },
              { label: "Frequência mínima", value: `${schoolConfig.academic.minimumAttendance}%` }
            ]}
          />
        </AdminSection>
      </section>

      <AdminSection title="Ano letivo e períodos" description="Períodos persistidos no banco de dados.">
        <div className="grid gap-2 md:grid-cols-2">
          {settings.periods.map((period) => (
            <div key={period.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span>{period.academicYear.year} · {period.name}</span>
              <Badge>{formatDate(period.startsAt)} até {formatDate(period.endsAt)}</Badge>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Auditoria" description="Últimas ações registradas no escopo da escola.">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ação</th>
                <th>Usuário</th>
                <th>Entidade</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {settings.auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-medium">{auditActionLabel(log.action)}</td>
                  <td>{log.user?.name ?? "Sistema"}</td>
                  <td>{auditEntityLabel(log.entity)}</td>
                  <td>{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </main>
  );
}
