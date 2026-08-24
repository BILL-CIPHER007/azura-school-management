import type React from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { auditActionLabel, auditEntityLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getSchoolSettings } from "@/services/school-data";

export const dynamic = "force-dynamic";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type AcademicYearInfo = {
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

type PeriodInfo = {
  id: string;
  academicYearId: string;
  startsAt: Date;
  endsAt: Date;
};

function SettingValue({
  value,
  source,
  tone = "neutral"
}: {
  value: React.ReactNode;
  source: string;
  tone?: Tone;
}) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span>{value}</span>
      <Badge variant={tone} className="font-normal">
        {source}
      </Badge>
    </span>
  );
}

function academicYearStatus(year: AcademicYearInfo): { label: string; tone: Tone } {
  const now = new Date();
  if (year.isActive) return { label: "Ativo", tone: "success" };
  if (year.startsAt > now) return { label: "Futuro", tone: "info" };
  if (year.endsAt < now) return { label: "Encerrado", tone: "neutral" };
  return { label: "Em andamento", tone: "warning" };
}

function buildPeriodHealth(periods: PeriodInfo[]) {
  const byAcademicYear = new Map<string, PeriodInfo[]>();
  const result = new Map<string, { label: string; tone: Tone }>();

  for (const period of periods) {
    const current = byAcademicYear.get(period.academicYearId) ?? [];
    current.push(period);
    byAcademicYear.set(period.academicYearId, current);
  }

  for (const groupedPeriods of byAcademicYear.values()) {
    let previous: PeriodInfo | null = null;
    for (const period of groupedPeriods) {
      if (period.startsAt >= period.endsAt) {
        result.set(period.id, { label: "Datas inválidas", tone: "danger" });
      } else if (previous && previous.endsAt >= period.startsAt) {
        result.set(period.id, { label: "Sobreposição", tone: "warning" });
      } else {
        result.set(period.id, { label: "Consistente", tone: "success" });
      }
      previous = period;
    }
  }

  return result;
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export default async function SettingsPage() {
  const session = await requireSession(["ADMIN"]);
  const settings = await getSchoolSettings(session.schoolId);
  const activeAcademicYear = settings.academicYears.find((year) => year.isActive) ?? null;
  const periodHealth = buildPeriodHealth(settings.periods);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Configurações"
        description="Produto, escola, ano letivo, regras acadêmicas e auditoria básica."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Configurações" }]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminSection title="Produto e escola" description="Dados cadastrais da escola e branding do produto.">
          <DefinitionList
            items={[
              {
                label: "Escola no banco",
                value: <SettingValue value={settings.school.name} source="School.name" tone="success" />
              },
              {
                label: "Produto configurado",
                value: <SettingValue value={schoolConfig.fullName} source="Arquivo/env" tone="info" />
              },
              {
                label: "Nome curto do produto",
                value: <SettingValue value={schoolConfig.shortName} source="Arquivo/env" tone="info" />
              },
              {
                label: "Sigla do produto",
                value: <SettingValue value={schoolConfig.initials} source="Arquivo/env" tone="info" />
              },
              {
                label: "Slug da escola",
                value: <SettingValue value={settings.school.slug} source="Estrutural" tone="warning" />
              }
            ]}
          />
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-text-secondary">
            O branding identifica o produto da instalação e pode exigir alteração de arquivo, variável de ambiente e
            novo deploy. O slug identifica a escola no banco e não deve ser editado diretamente nesta tela.
          </p>
        </AdminSection>

        <AdminSection title="Regras acadêmicas" description="Leitura da fonte central usada pelos helpers do sistema.">
          <DefinitionList
            items={[
              {
                label: "Ano letivo padrão",
                value: (
                  <SettingValue
                    value={activeAcademicYear?.year ?? schoolConfig.academic.academicYear}
                    source={activeAcademicYear ? "AcademicYear ativo" : "Fallback estático"}
                    tone={activeAcademicYear ? "success" : "warning"}
                  />
                )
              },
              {
                label: "Sistema de períodos",
                value: <SettingValue value={schoolConfig.academic.gradingSystem} source="Arquivo" tone="info" />
              },
              {
                label: "Média mínima",
                value: (
                  <SettingValue value={schoolConfig.academic.passingGrade.toFixed(1)} source="Arquivo" tone="info" />
                )
              },
              {
                label: "Nota de recuperação",
                value: (
                  <SettingValue value={schoolConfig.academic.recoveryGrade.toFixed(1)} source="Arquivo" tone="info" />
                )
              },
              {
                label: "Frequência mínima",
                value: (
                  <SettingValue value={`${schoolConfig.academic.minimumAttendance}%`} source="Arquivo" tone="info" />
                )
              }
            ]}
          />
          <p className="mt-4 rounded-md border border-warning/20 bg-warning-soft/40 p-3 text-sm leading-6 text-text-secondary">
            Estas regras ainda não têm persistência por escola. Por isso, permanecem somente leitura para evitar uma
            configuração aparente que não seria aplicada com segurança ao histórico acadêmico.
          </p>
        </AdminSection>
      </section>

      <AdminSection title="Anos letivos" description="Registros reais persistidos por escola.">
        {settings.academicYears.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {settings.academicYears.map((year) => {
              const status = academicYearStatus(year);
              return (
                <div key={year.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-school-navy">{year.year}</span>
                    <Badge variant={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-2 text-text-secondary">
                    {formatDate(year.startsAt)} até {formatDate(year.endsAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="Nenhum ano letivo cadastrado"
            description="Cadastre o ano letivo antes de disponibilizar turmas, períodos e matrículas."
          />
        )}
      </AdminSection>

      <AdminSection title="Ano letivo e períodos" description="Períodos persistidos no banco de dados.">
        {settings.periods.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {settings.periods.map((period) => {
              const health = periodHealth.get(period.id) ?? { label: "Não verificado", tone: "neutral" as Tone };
              return (
                <div key={period.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-school-navy">
                      {period.academicYear.year} · {period.name}
                    </span>
                    <Badge variant={health.tone}>{health.label}</Badge>
                  </div>
                  <p className="mt-2 text-text-secondary">
                    {formatDate(period.startsAt)} até {formatDate(period.endsAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="Nenhum período acadêmico cadastrado"
            description="Configure o ano letivo para disponibilizar os períodos acadêmicos."
          />
        )}
      </AdminSection>

      <AdminSection
        title="Auditoria"
        description="Últimas ações registradas no escopo da escola. Logs são somente leitura."
      >
        {settings.auditLogs.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Usuário</th>
                  <th>Entidade</th>
                  <th>ID</th>
                  <th>Data e hora</th>
                </tr>
              </thead>
              <tbody>
                {settings.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-medium">{auditActionLabel(log.action)}</td>
                    <td>{log.user?.name ?? "Sistema"}</td>
                    <td>{auditEntityLabel(log.entity)}</td>
                    <td className="font-mono text-xs text-text-muted">{shortId(log.entityId)}</td>
                    <td>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="Nenhuma atividade registrada"
            description="As ações administrativas e acadêmicas aparecerão aqui."
          />
        )}
      </AdminSection>
    </main>
  );
}
