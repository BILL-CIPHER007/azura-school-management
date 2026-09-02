import type React from "react";
import { closeAcademicPeriod, closeAcademicYear, reopenAcademicPeriod } from "@/app/actions/academic";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { AdminEmptyState, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { getAcademicPeriodClosingState, isAcademicYearClosed } from "@/lib/academic-closing";
import { auditActionLabel, auditEntityLabel } from "@/lib/admin-labels";
import { formatSchoolPlan, getPlanConfig } from "@/lib/commercial-plans";
import { requireSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getSchoolSettings } from "@/services/school-data";

export const dynamic = "force-dynamic";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type AcademicYearInfo = {
  id: string;
  year: number;
  startsAt: Date;
  endsAt: Date;
  closedAt: Date | null;
  isActive: boolean;
  periods?: Array<{ closedAt: Date | null }>;
};

type PeriodInfo = {
  id: string;
  academicYearId: string;
  name?: string;
  startsAt: Date;
  endsAt: Date;
  closedAt: Date | null;
  academicYear: { year: number; closedAt: Date | null };
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
  if (isAcademicYearClosed(year)) return { label: "Encerrado", tone: "neutral" };
  if (year.isActive) return { label: "Ativo", tone: "success" };
  if (year.startsAt > now) return { label: "Futuro", tone: "info" };
  return { label: "Em andamento", tone: "warning" };
}

function periodClosingTone(reason: ReturnType<typeof getAcademicPeriodClosingState>["reason"]): Tone {
  if (reason === "ready") return "success";
  if (reason === "not-started") return "info";
  if (reason === "in-progress") return "warning";
  return "neutral";
}

function settingsFeedback(params: { erro?: string; sucesso?: string; periodo?: string; total?: string; estado?: string }) {
  if (params.erro === "pendencias-periodo") {
    const period = params.periodo ? ` em ${params.periodo}` : "";
    return {
      tone: "warning" as Tone,
      title: "Período ainda possui pendências",
      description: `${params.total ?? "Alguns"} lançamento(s) de notas ainda precisam ser concluídos${period}.`
    };
  }
  if (params.erro === "periodos-abertos") {
    return {
      tone: "warning" as Tone,
      title: "Ano letivo ainda possui períodos abertos",
      description: `Encerre todos os períodos antes de finalizar o ano letivo. Períodos abertos: ${params.total ?? "1"}.`
    };
  }
  if (params.erro === "ano-encerrado") {
    return {
      tone: "warning" as Tone,
      title: "Ano letivo encerrado",
      description: "Não é possível alterar períodos de um ano letivo já encerrado."
    };
  }
  if (params.erro === "periodo-fora-do-prazo") {
    const period = params.periodo ? `: ${params.periodo}` : "";
    const state = params.estado === "not-started" ? "ainda não começou" : "ainda está em andamento";
    return {
      tone: "warning" as Tone,
      title: "Período ainda não pode ser encerrado",
      description: `O período${period} ${state}. O fechamento fica disponível a partir da data final do período.`
    };
  }
  if (params.sucesso) {
    return {
      tone: "success" as Tone,
      title: "Configuração acadêmica atualizada",
      description: "O estado de fechamento foi salvo e registrado na auditoria."
    };
  }
  return null;
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

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string; periodo?: string; total?: string; estado?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["ADMIN"]);
  const settings = await getSchoolSettings(session.schoolId);
  const activeAcademicYear = settings.academicYears.find((year) => year.isActive) ?? null;
  const periodHealth = buildPeriodHealth(settings.periods);
  const feedback = settingsFeedback(query);
  const planConfig = getPlanConfig(settings.school.plan);
  const studentLimitUsage = Math.round((settings.activeStudentsCount / planConfig.maxActiveStudents) * 100);
  const isNearStudentLimit = studentLimitUsage >= 90;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Configurações"
        description="Produto, escola, ano letivo, regras acadêmicas e auditoria básica."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Configurações" }]}
      />

      {feedback ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            feedback.tone === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-warning/20 bg-warning-soft text-warning"
          }`}
        >
          <strong className="block text-school-navy">{feedback.title}</strong>
          <span className="mt-1 block text-text-secondary">{feedback.description}</span>
        </div>
      ) : null}

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

        <AdminSection title="Plano atual" description="Limites comerciais ativos para esta escola.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <span className="text-xs font-semibold uppercase text-text-muted">Plano contratado</span>
              <p className="mt-2 text-2xl font-semibold text-school-navy">{formatSchoolPlan(settings.school.plan)}</p>
              <p className="mt-1 text-sm text-text-secondary">Configuração aplicada pelo sistema.</p>
            </div>
            <div
              className={`rounded-md border p-3 ${
                isNearStudentLimit ? "border-warning/30 bg-warning-soft/30" : "border-success/20 bg-success-soft/20"
              }`}
            >
              <span className="text-xs font-semibold uppercase text-text-muted">Alunos ativos</span>
              <p className="mt-2 text-2xl font-semibold text-school-navy">
                {settings.activeStudentsCount} de {planConfig.maxActiveStudents}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${isNearStudentLimit ? "bg-warning" : "bg-success"}`}
                  style={{ width: `${Math.min(studentLimitUsage, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {isNearStudentLimit
                  ? "A escola está próxima do limite de alunos ativos do plano."
                  : "Capacidade disponível para novas matrículas ativas."}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-text-secondary">
            O plano é somente leitura nesta etapa. Mudanças comerciais devem ser feitas fora do portal administrativo.
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
              const openPeriods = year.periods?.filter((period) => !period.closedAt).length ?? 0;
              return (
                <div key={year.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-school-navy">{year.year}</span>
                    <Badge variant={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-2 text-text-secondary">
                    {formatDate(year.startsAt)} até {formatDate(year.endsAt)}
                  </p>
                  {year.closedAt ? (
                    <p className="mt-2 text-xs text-text-muted">Encerrado em {formatDateTime(year.closedAt)}</p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2">
                      {openPeriods > 0 ? (
                        <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
                          {openPeriods} {openPeriods === 1 ? "período ainda aberto" : "períodos ainda abertos"}
                        </p>
                      ) : null}
                      <form action={closeAcademicYear}>
                        <input type="hidden" name="academicYearId" value={year.id} />
                        <ConfirmSubmitButton
                          message={`Encerrar o ano letivo ${year.year}? Esta ação bloqueia novos lançamentos acadêmicos neste ano.`}
                          pendingLabel="Encerrando..."
                          icon="none"
                          variant="secondary"
                          className="w-fit"
                          disabled={openPeriods > 0}
                        >
                          Encerrar ano letivo
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
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
              const closingState = getAcademicPeriodClosingState(period);
              const closingTone = periodClosingTone(closingState.reason);
              return (
                <div key={period.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-school-navy">
                      {period.academicYear.year} · {period.name}
                    </span>
                    <span className="flex flex-wrap justify-end gap-2">
                      <Badge variant={closingTone}>{closingState.label}</Badge>
                      <Badge variant={health.tone}>{health.label}</Badge>
                    </span>
                  </div>
                  <p className="mt-2 text-text-secondary">
                    {formatDate(period.startsAt)} até {formatDate(period.endsAt)}
                  </p>
                  {period.closedAt ? (
                    <p className="mt-2 text-xs text-text-muted">Encerrado em {formatDateTime(period.closedAt)}</p>
                  ) : null}
                  <div className="mt-3">
                    {period.academicYear.closedAt ? (
                      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-text-secondary">
                        Ano letivo encerrado. Período bloqueado para alterações.
                      </p>
                    ) : period.closedAt ? (
                      <form action={reopenAcademicPeriod}>
                        <input type="hidden" name="periodId" value={period.id} />
                        <ConfirmSubmitButton
                          message={`Reabrir ${period.name}? Lançamentos acadêmicos voltarão a ser permitidos neste período.`}
                          pendingLabel="Reabrindo..."
                          icon="none"
                          variant="outline"
                          className="w-fit"
                        >
                          Reabrir período
                        </ConfirmSubmitButton>
                      </form>
                    ) : !closingState.canClose ? (
                      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-text-secondary">
                        {closingState.label}. O fechamento ficará disponível a partir de {formatDate(period.endsAt)}.
                      </p>
                    ) : (
                      <form action={closeAcademicPeriod}>
                        <input type="hidden" name="periodId" value={period.id} />
                        <ConfirmSubmitButton
                          message={`Encerrar ${period.name}? O sistema verificará pendências reais antes de bloquear lançamentos.`}
                          pendingLabel="Encerrando..."
                          icon="none"
                          variant="secondary"
                          className="w-fit"
                        >
                          Encerrar período
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
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
