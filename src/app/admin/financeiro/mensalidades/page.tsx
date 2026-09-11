import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, CircleDollarSign, ReceiptText, UsersRound } from "lucide-react";
import {
  emitBillingBatchPaymentsAction,
  generateBillingBatchAction,
  runBillingAutomationNowAction,
  saveBillingRuleAction
} from "@/app/actions/financial";
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/app/admin/financeiro/financial-admin-controls";
import {
  billingCompetenceLabel,
  billingTypeLabel,
  formatCurrencyBRL
} from "@/lib/financial-core";
import { requireSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { FinancialError, getRecurringBillingAdmin } from "@/services/financial";

export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  regra: "Regra de mensalidade salva.",
  automacao: "Automacao executada para a competencia atual.",
  "automacao-sem-novos": "Automacao executada; nenhuma nova mensalidade foi criada.",
  lote: "Mensalidades geradas com sucesso.",
  "lote-sem-novos": "Nenhuma nova mensalidade foi criada; as cobranças existentes foram preservadas.",
  emissao: "Emissao em lote concluida.",
  "emissao-parcial": "Emissao em lote concluida com algumas pendencias."
};

const errorMessages: Record<string, string> = {
  validacao: "Revise os campos informados.",
  plano: "O financeiro esta disponivel apenas no plano Profissional.",
  regra: "Regra de mensalidade nao encontrada ou invalida.",
  valor: "Informe um valor valido maior que zero.",
  data: "Informe datas validas.",
  competencia: "Informe uma competencia valida.",
  lote: "Nao foi possivel gerar o lote.",
  emissao: "Nao foi possivel concluir a emissao em lote.",
  asaas: "Nao foi possivel concluir a integracao com o Asaas Sandbox.",
  automacao: "Nao foi possivel executar a automacao."
};

type RecurringBillingAdminData = Awaited<ReturnType<typeof getRecurringBillingAdmin>>;
type BillingRuleRow = RecurringBillingAdminData["rules"][number];
type BillingBatchRow = RecurringBillingAdminData["batches"][number];
type BillingPreviewRow = NonNullable<RecurringBillingAdminData["preview"]>["rows"][number];

function Field({
  id,
  label,
  help,
  className,
  children
}: {
  id: string;
  label: string;
  help?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
      </label>
      {children}
      {help ? <p id={`${id}-help`} className="mt-1.5 text-xs leading-5 text-text-muted">{help}</p> : null}
    </div>
  );
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function ruleScopeLabel(rule: BillingRuleRow) {
  return rule.classroom ? rule.classroom.name : "Todos os alunos ativos";
}

function rowSituation(row: BillingPreviewRow) {
  if (row.situation === "EXISTS") return { label: "Ja gerada", tone: "neutral" as const };
  if (row.situation === "NO_PAYMENT_GUARDIAN") return { label: "Interna; Asaas pendente", tone: "warning" as const };
  return { label: "Pronta", tone: "success" as const };
}

function batchRuleLabel(batch: BillingBatchRow) {
  const scope = batch.billingRule.classroom ? ` - ${batch.billingRule.classroom.name}` : "";
  return `${batch.billingRule.name}${scope}`;
}

function automationStatusLabel(status: BillingRuleRow["automationRuns"][number]["status"]) {
  const labels = {
    SUCCESS: "Concluida",
    SKIPPED: "Sem novas mensalidades",
    FAILED: "Falhou"
  };
  return labels[status];
}

function automationStatusTone(status: BillingRuleRow["automationRuns"][number]["status"]) {
  const tones = {
    SUCCESS: "success",
    SKIPPED: "neutral",
    FAILED: "danger"
  } as const;
  return tones[status];
}

export default async function AdminRecurringBillingPage({
  searchParams
}: {
  searchParams: Promise<{ regra?: string; competencia?: string; erro?: string; sucesso?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;

  let data: RecurringBillingAdminData;
  try {
    data = await getRecurringBillingAdmin(session.schoolId, {
      billingRuleId: query.regra,
      competence: query.competencia || currentMonthValue()
    });
  } catch (error) {
    if (error instanceof FinancialError && error.code === "plano") {
      redirect("/admin/configuracoes?erro=financeiro-plano");
    }
    throw error;
  }

  const selectedRule = data.selectedRule;
  const preview = data.preview;
  const lastAutomationRun = selectedRule?.automationRuns[0] ?? null;
  const feedback = query.sucesso
    ? successMessages[query.sucesso]
    : query.erro
      ? errorMessages[query.erro] ?? "Nao foi possivel concluir a acao."
      : null;
  const feedbackTone = query.sucesso ? "success" : "warning";

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Mensalidades"
        description="Configure regras recorrentes, visualize a competencia e gere cobrancas internas com seguranca."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Financeiro", href: "/admin/financeiro" },
          { label: "Mensalidades" }
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/financeiro/inadimplencia">Inadimplencia</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/financeiro">Cobrancas</Link>
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
          <Badge variant={feedbackTone}>{feedback}</Badge>
        </div>
      ) : null}

      <AdminSection
        title="Configuracao da mensalidade"
        description="Defina a regra recorrente usada para gerar cobrancas por competencia."
      >
        <form action={saveBillingRuleAction} className="grid gap-3 lg:grid-cols-[1.1fr_160px_130px_1fr]">
          {selectedRule ? <input type="hidden" name="ruleId" value={selectedRule.id} /> : null}
          <Field id="billing-rule-name" label="Nome da regra">
            <Input
              id="billing-rule-name"
              name="name"
              placeholder="Nome da mensalidade"
              defaultValue={selectedRule?.name ?? ""}
              required
            />
          </Field>
          <Field id="billing-rule-amount" label="Valor mensal">
            <CurrencyInput id="billing-rule-amount" name="amount" defaultValue={selectedRule?.amount.toString()} required />
          </Field>
          <Field
            id="billing-rule-due-day"
            label="Dia do vencimento"
            help="Se o mes tiver menos dias, o sistema usa o ultimo dia valido."
          >
            <Input
              id="billing-rule-due-day"
              name="dueDay"
              type="number"
              min={1}
              max={31}
              placeholder="Dia"
              defaultValue={selectedRule?.dueDay.toString() ?? ""}
              required
              aria-describedby="billing-rule-due-day-help"
            />
          </Field>
          <Field id="billing-rule-classroom" label="Turma">
            <Select id="billing-rule-classroom" name="classroomId" defaultValue={selectedRule?.classroomId ?? ""}>
              <option value="">Todos os alunos ativos</option>
              {data.classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} - {classroom.academicYear.year}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="billing-rule-starts-on" label="Inicio da vigencia">
            <Input id="billing-rule-starts-on" name="startsOn" type="date" defaultValue={formatDateInput(selectedRule?.startsOn)} />
          </Field>
          <Field id="billing-rule-ends-on" label="Fim da vigencia">
            <Input id="billing-rule-ends-on" name="endsOn" type="date" defaultValue={formatDateInput(selectedRule?.endsOn)} />
          </Field>
          <Field id="billing-rule-active" label="Status">
            <label
              htmlFor="billing-rule-active"
              className="flex h-10 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-text-secondary shadow-sm"
            >
              <input
                id="billing-rule-active"
                type="checkbox"
                name="isActive"
                defaultChecked={selectedRule?.isActive ?? true}
                className="h-4 w-4"
              />
              Regra ativa
            </label>
          </Field>
          <Button type="submit" className="self-end">{selectedRule ? "Salvar regra" : "Criar regra"}</Button>
          <div className="lg:col-span-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <Field
                id="billing-rule-auto-generate"
                label="Automacao"
                help="Gera mensalidades internas automaticamente na competencia atual. Pix e boleto continuam manuais."
              >
                <label
                  htmlFor="billing-rule-auto-generate"
                  className="flex min-h-10 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-text-secondary shadow-sm"
                >
                  <input
                    id="billing-rule-auto-generate"
                    type="checkbox"
                    name="autoGenerate"
                    defaultChecked={selectedRule?.autoGenerate ?? false}
                    className="h-4 w-4"
                  />
                  Gerar mensalidades automaticamente
                </label>
              </Field>
              <Field
                id="billing-rule-generation-day"
                label="Dia da geracao"
                help="Se o mes tiver menos dias, o sistema usa o ultimo dia valido."
              >
                <Input
                  id="billing-rule-generation-day"
                  name="generationDay"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Dia"
                  defaultValue={selectedRule?.generationDay.toString() ?? "1"}
                  aria-describedby="billing-rule-generation-day-help"
                />
              </Field>
            </div>
          </div>
          <Field id="billing-rule-notes" label="Observacao" className="lg:col-span-4">
            <textarea
              id="billing-rule-notes"
              name="notes"
              placeholder="Observacao opcional para as cobrancas geradas"
              defaultValue={selectedRule?.notes ?? ""}
              className="min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </Field>
        </form>
      </AdminSection>

      <AdminToolbar>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Field id="billing-preview-rule" label="Regra de mensalidade">
            <Select id="billing-preview-rule" name="regra" defaultValue={selectedRule?.id ?? ""}>
              {data.rules.length ? null : <option value="">Nenhuma regra configurada</option>}
              {data.rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} - {ruleScopeLabel(rule)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="billing-preview-competence" label="Competencia" help="Formato AAAA-MM">
            <Input
              id="billing-preview-competence"
              type="month"
              name="competencia"
              defaultValue={data.selectedCompetence}
              aria-describedby="billing-preview-competence-help"
            />
          </Field>
          <Button type="submit" variant="secondary" className="self-end">
            Atualizar preview
          </Button>
        </form>
      </AdminToolbar>

      {selectedRule ? (
        <AdminSection
          title="Automacao"
          description="Controle a geracao interna de mensalidades. A emissao Pix/Boleto continua manual no Asaas Sandbox."
          action={
            <form action={runBillingAutomationNowAction}>
              <input type="hidden" name="billingRuleId" value={selectedRule.id} />
              <ConfirmSubmitButton
                message={`Executar a geracao automatica de ${billingCompetenceLabel(data.selectedCompetence)} agora? Cobrancas existentes serao preservadas.`}
                pendingLabel="Executando..."
                icon="none"
                variant="outline"
                disabled={!selectedRule.isActive || !selectedRule.autoGenerate}
              >
                Executar geracao agora
              </ConfirmSubmitButton>
            </form>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-medium uppercase text-text-muted">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={selectedRule.autoGenerate ? "success" : "neutral"}>
                  {selectedRule.autoGenerate ? "Automatica ativa" : "Automatica inativa"}
                </Badge>
                {!selectedRule.isActive ? <Badge variant="warning">Regra inativa</Badge> : null}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-medium uppercase text-text-muted">Proxima geracao</p>
              <p className="mt-2 font-semibold text-school-navy">
                {selectedRule.nextGenerationAt ? formatDate(selectedRule.nextGenerationAt) : "Nao programada"}
              </p>
              <p className="mt-1 text-xs text-text-muted">Dia {selectedRule.generationDay} de cada mes</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-medium uppercase text-text-muted">Ultima competencia</p>
              <p className="mt-2 font-semibold text-school-navy">
                {selectedRule.lastGeneratedCompetence
                  ? billingCompetenceLabel(selectedRule.lastGeneratedCompetence)
                  : "Nenhuma geracao"}
              </p>
              <p className="mt-1 text-xs text-text-muted">Atualizada pelo job ou por execucao manual.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-medium uppercase text-text-muted">Ultimo resultado</p>
              {lastAutomationRun ? (
                <>
                  <div className="mt-2">
                    <Badge variant={automationStatusTone(lastAutomationRun.status)}>
                      {automationStatusLabel(lastAutomationRun.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{formatDateTime(lastAutomationRun.createdAt)}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {lastAutomationRun.generatedCharges} criadas · {lastAutomationRun.existingCharges} existentes ·{" "}
                    {lastAutomationRun.skippedStudents} ignoradas
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-semibold text-school-navy">Sem execucao registrada</p>
                  <p className="mt-1 text-xs text-text-muted">O historico aparecera apos a primeira geracao.</p>
                </>
              )}
            </div>
          </div>
        </AdminSection>
      ) : null}

      {selectedRule && preview ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AdminMetric label="Alunos no escopo" value={preview.summary.totalStudents} detail="matriculas ativas" icon={UsersRound} />
            <AdminMetric label="Elegiveis" value={preview.summary.eligibleStudents} detail="a gerar" icon={CheckCircle2} tone="success" />
            <AdminMetric label="Ja existentes" value={preview.summary.existingCharges} detail="sem duplicar" icon={ReceiptText} tone="neutral" />
            <AdminMetric label="Pendencias Asaas" value={preview.summary.missingPaymentGuardian} detail="responsavel" icon={CalendarClock} tone="warning" />
            <AdminMetric label="Vencimento" value={formatDate(preview.dueDate)} detail={preview.competenceLabel} icon={CalendarClock} tone="info" />
            <AdminMetric
              label="Valor previsto"
              value={formatCurrencyBRL(preview.summary.predictedAmount)}
              detail="novas cobrancas"
              icon={CircleDollarSign}
              tone="info"
            />
          </section>

          <AdminSection
            title={`Preview da competencia ${preview.competenceLabel}`}
            description="Nenhuma cobranca e criada antes da confirmacao."
            action={
              <form action={generateBillingBatchAction}>
                <input type="hidden" name="billingRuleId" value={selectedRule.id} />
                <input type="hidden" name="competence" value={preview.competence} />
                <ConfirmSubmitButton
                  message={`Gerar mensalidades de ${preview.competenceLabel}? Cobrancas existentes serao preservadas.`}
                  pendingLabel="Gerando..."
                  disabled={!preview.canGenerate}
                >
                  Gerar mensalidades
                </ConfirmSubmitButton>
              </form>
            }
          >
            {preview.rangeWarning ? (
              <AdminEmptyState title="Competencia fora da vigencia" description={preview.rangeWarning} />
            ) : preview.rows.length ? (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Responsavel</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Situacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => {
                      const situation = rowSituation(row);
                      return (
                        <tr key={row.enrollmentId}>
                          <td className="font-semibold text-school-navy">{row.studentName}</td>
                          <td>
                            <p>{row.classroomName}</p>
                            <p className="text-xs text-text-muted">Ano letivo {row.academicYear}</p>
                          </td>
                          <td>{row.guardianName ?? <span className="text-text-muted">Sem responsavel vinculado</span>}</td>
                          <td className="font-semibold text-school-navy">{formatCurrencyBRL(preview.amount)}</td>
                          <td>{formatDate(preview.dueDate)}</td>
                          <td>
                            <Badge variant={situation.tone}>{situation.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState title="Nenhum aluno elegivel" description="Nao ha matriculas ativas no escopo desta regra." />
            )}
          </AdminSection>
        </>
      ) : (
        <AdminEmptyState title="Configure uma regra de mensalidade" description="Depois de salvar a regra, o preview da competencia aparecera aqui." />
      )}

      <AdminSection title="Historico de competencias" description="Acompanhe lotes gerados e emita cobrancas internas no Asaas Sandbox.">
        {data.batches.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Regra</th>
                  <th>Geradas</th>
                  <th>Resumo</th>
                  <th>Valores</th>
                  <th>Gerado por</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <p className="font-semibold text-school-navy">{billingCompetenceLabel(batch.competence)}</p>
                      <p className="text-xs text-text-muted">Vencimento {formatDate(batch.dueDate)}</p>
                    </td>
                    <td>{batchRuleLabel(batch)}</td>
                    <td>
                      <p className="font-semibold text-school-navy">{batch.generatedCharges}</p>
                      <p className="text-xs text-text-muted">
                        {batch.existingCharges} existentes antes da geracao
                      </p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="warning">{batch.summary.pending} pendentes</Badge>
                        <Badge variant="info">{batch.summary.issued} emitidas</Badge>
                        <Badge variant="success">{batch.summary.paid} pagas</Badge>
                        <Badge variant="danger">{batch.summary.overdue} vencidas</Badge>
                        <Badge variant="neutral">{batch.summary.canceled} canceladas</Badge>
                        {batch.summary.errors ? <Badge variant="danger">{batch.summary.errors} com erro</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <p className="font-semibold text-school-navy">{formatCurrencyBRL(batch.summary.predictedAmount)}</p>
                      <p className="text-xs text-text-muted">Recebido {formatCurrencyBRL(batch.summary.receivedAmount)}</p>
                    </td>
                    <td>
                      <p>{batch.generatedBy?.name ?? "Sistema"}</p>
                      <p className="text-xs text-text-muted">{formatDate(batch.createdAt)}</p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {(["PIX", "BOLETO"] as const).map((billingType) => (
                          <form key={billingType} action={emitBillingBatchPaymentsAction}>
                            <input type="hidden" name="billingRuleId" value={batch.billingRuleId} />
                            <input type="hidden" name="competence" value={batch.competence} />
                            <input type="hidden" name="billingType" value={billingType} />
                            <ConfirmSubmitButton
                              message={`Emitir mensalidades pendentes em ${billingType === "PIX" ? "Pix" : "Boleto"} no Asaas Sandbox?`}
                              pendingLabel="Emitindo..."
                              icon="none"
                              variant={billingType === "PIX" ? "subtle" : "outline"}
                            >
                              Emitir {billingTypeLabel(billingType)}
                            </ConfirmSubmitButton>
                          </form>
                        ))}
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/admin/financeiro?mes=${batch.competence}`}>Ver cobrancas</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="Nenhuma competencia gerada" description="Os lotes de mensalidades aparecerao aqui apos a geracao." />
        )}
      </AdminSection>
    </main>
  );
}
