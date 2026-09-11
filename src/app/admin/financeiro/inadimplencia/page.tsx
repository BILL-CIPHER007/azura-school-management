import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, CircleDollarSign, History, PhoneCall, UsersRound } from "lucide-react";
import { registerCollectionActionAction } from "@/app/actions/financial";
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireSession } from "@/lib/auth";
import {
  asaasPaymentStatusLabel,
  asaasPaymentStatusTone,
  billingCompetenceLabel,
  COLLECTION_RECOMMENDATIONS,
  DELINQUENCY_BUCKETS,
  delinquencyBucketLabel,
  delinquencyBucketTone,
  formatCurrencyBRL,
  paymentProviderLabel,
  type DelinquencyBucket
} from "@/lib/financial-core";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  FinancialError,
  getAdminDelinquencyOverview,
  type DelinquencyStatusFilter
} from "@/services/financial";

export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  contato: "Contato registrado com sucesso.",
  observacao: "Observacao adicionada com sucesso.",
  promessa: "Promessa de pagamento registrada com sucesso."
};

const errorMessages: Record<string, string> = {
  validacao: "Revise os campos informados.",
  plano: "O financeiro esta disponivel apenas no plano Profissional.",
  cobranca: "Cobranca nao encontrada.",
  status: "Esta cobranca nao esta inadimplente.",
  data: "Informe uma data valida.",
  competencia: "Competencia invalida."
};

const statusFilters: Array<{ value: "" | DelinquencyStatusFilter; label: string }> = [
  { value: "", label: "Todos os status" },
  { value: "NO_GATEWAY", label: "Sem gateway" },
  { value: "ASAAS_PENDING", label: "Asaas pendente" },
  { value: "ASAAS_OVERDUE", label: "Asaas vencido" },
  { value: "SYNC_ERROR", label: "Falha de sincronizacao" }
];

const channelLabels = {
  PHONE: "Telefone",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  IN_PERSON: "Presencial",
  OTHER: "Outro"
};

const actionLabels = {
  CONTACT: "Contato realizado",
  CONTACTED: "Marcado como contatado",
  NOTE: "Observacao",
  PAYMENT_PROMISE: "Promessa de pagamento"
};

const promiseStatusLabels = {
  OPEN: "Promessa aberta",
  FULFILLED: "Promessa cumprida",
  OVERDUE: "Promessa vencida",
  CANCELED: "Promessa cancelada"
};

function compactClassroom(row: Awaited<ReturnType<typeof getAdminDelinquencyOverview>>["rows"][number]) {
  const enrollment = row.charge.enrollment;
  if (!enrollment) return "Sem turma";
  return `${enrollment.classroom.name} - ${enrollment.academicYear.year}`;
}

function latestActionText(row: Awaited<ReturnType<typeof getAdminDelinquencyOverview>>["rows"][number]) {
  if (!row.latestAction) return "Sem contato registrado";
  return actionLabels[row.latestAction.type];
}

export default async function AdminDelinquencyPage({
  searchParams
}: {
  searchParams: Promise<{
    turma?: string;
    competencia?: string;
    faixa?: string;
    responsavel?: string;
    aluno?: string;
    status?: string;
    inicio?: string;
    fim?: string;
    sucesso?: string;
    erro?: string;
  }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;

  let overview: Awaited<ReturnType<typeof getAdminDelinquencyOverview>>;
  try {
    overview = await getAdminDelinquencyOverview(session.schoolId, {
      classroomId: query.turma || undefined,
      competence: query.competencia || undefined,
      bucket: Object.keys(DELINQUENCY_BUCKETS).includes(query.faixa ?? "")
        ? (query.faixa as DelinquencyBucket)
        : undefined,
      guardianId: query.responsavel || undefined,
      studentId: query.aluno || undefined,
      status: statusFilters.some((item) => item.value === query.status) ? (query.status as DelinquencyStatusFilter) : undefined,
      dueFrom: query.inicio || undefined,
      dueTo: query.fim || undefined
    });
  } catch (error) {
    if (error instanceof FinancialError && error.code === "plano") {
      redirect("/admin/configuracoes?erro=financeiro-plano");
    }
    throw error;
  }

  const feedback = query.sucesso
    ? successMessages[query.sucesso]
    : query.erro
      ? errorMessages[query.erro] ?? "Nao foi possivel concluir a acao."
      : null;

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Inadimplencia"
        description="Acompanhe cobrancas vencidas, registre contatos e organize promessas de pagamento."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Financeiro", href: "/admin/financeiro" },
          { label: "Inadimplencia" }
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/financeiro">Cobrancas</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/financeiro/mensalidades">Mensalidades</Link>
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
          <Badge variant={query.sucesso ? "success" : "warning"}>{feedback}</Badge>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Total em aberto" value={formatCurrencyBRL(overview.summary.totalOpen)} detail="cobrancas vencidas" icon={CircleDollarSign} tone="warning" />
        <AdminMetric label="Valor vencido" value={formatCurrencyBRL(overview.summary.overdueAmount)} detail={`${overview.summary.overdueCount} cobrancas`} icon={AlertTriangle} tone="danger" />
        <AdminMetric label="Responsaveis" value={overview.summary.delinquentGuardians} detail="em acompanhamento" icon={UsersRound} tone="info" />
        <AdminMetric label="Atraso medio" value={`${overview.summary.averageDelay} dias`} detail={`maior atraso: ${overview.summary.maxDelay} dias`} icon={CalendarClock} tone="warning" />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(DELINQUENCY_BUCKETS) as DelinquencyBucket[]).filter((bucket) => bucket !== "EM_DIA").map((bucket) => (
          <div key={bucket} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">{delinquencyBucketLabel(bucket)}</p>
                <p className="mt-1 text-2xl font-bold text-school-navy">{overview.summary.buckets[bucket].count}</p>
              </div>
              <Badge variant={delinquencyBucketTone(bucket)}>{DELINQUENCY_BUCKETS[bucket].shortLabel}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-muted">{formatCurrencyBRL(overview.summary.buckets[bucket].amount)}</p>
          </div>
        ))}
      </section>

      <AdminToolbar>
        <form className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select name="turma" defaultValue={query.turma ?? ""}>
            <option value="">Todas as turmas</option>
            {overview.classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </Select>
          <Input name="competencia" placeholder="Competencia, ex.: 2026-09" defaultValue={query.competencia ?? ""} />
          <Select name="faixa" defaultValue={query.faixa ?? ""}>
            <option value="">Todas as faixas</option>
            {(Object.keys(DELINQUENCY_BUCKETS) as DelinquencyBucket[]).filter((bucket) => bucket !== "EM_DIA").map((bucket) => (
              <option key={bucket} value={bucket}>
                {delinquencyBucketLabel(bucket)}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={query.status ?? ""}>
            {statusFilters.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select name="aluno" defaultValue={query.aluno ?? ""}>
            <option value="">Todos os alunos</option>
            {overview.students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </Select>
          <Select name="responsavel" defaultValue={query.responsavel ?? ""}>
            <option value="">Todos os responsaveis</option>
            {overview.guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.fullName}
              </option>
            ))}
          </Select>
          <Input name="inicio" type="date" defaultValue={query.inicio ?? ""} />
          <Input name="fim" type="date" defaultValue={query.fim ?? ""} />
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <Button type="submit">Filtrar</Button>
            <Button asChild variant="secondary">
              <Link href="/admin/financeiro/inadimplencia">Limpar filtros</Link>
            </Button>
          </div>
        </form>
      </AdminToolbar>

      <AdminSection title="Lista de inadimplentes" description="Cada linha representa uma cobranca vencida ainda em aberto.">
        {overview.rows.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1180px]">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Responsavel</th>
                  <th>Cobranca</th>
                  <th>Vencimento</th>
                  <th>Atraso</th>
                  <th>Status externo</th>
                  <th>Contato</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {overview.rows.map((row) => (
                  <tr key={row.charge.id}>
                    <td>
                      <Link href={`/admin/alunos/${row.charge.studentId}`} className="font-semibold text-school-navy hover:underline">
                        {row.charge.student.fullName}
                      </Link>
                      <p className="text-xs text-text-muted">{compactClassroom(row)}</p>
                    </td>
                    <td>
                      <p className="font-medium text-text-primary">{row.charge.guardian?.fullName ?? "Responsavel nao informado"}</p>
                      <p className="text-xs text-text-muted">{row.charge.guardian?.phone ?? row.charge.guardian?.email ?? "Contato nao informado"}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-school-navy">{row.charge.reference}</p>
                      <p className="text-xs text-text-muted">
                        {row.charge.competence ? billingCompetenceLabel(row.charge.competence) : "Sem competencia"} - {formatCurrencyBRL(row.charge.amount)}
                      </p>
                    </td>
                    <td>{formatDate(row.charge.dueDate)}</td>
                    <td>
                      <div className="space-y-2">
                        <Badge variant={delinquencyBucketTone(row.bucket)}>{row.daysOverdue} dias</Badge>
                        <p className="text-xs text-text-muted">{delinquencyBucketLabel(row.bucket)}</p>
                        <p className="text-xs font-semibold text-school-primary">{COLLECTION_RECOMMENDATIONS[row.recommendation]}</p>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-2">
                        <Badge variant={row.charge.provider ? "info" : "neutral"}>{paymentProviderLabel(row.charge.provider)}</Badge>
                        {row.charge.externalStatus ? (
                          <Badge variant={asaasPaymentStatusTone(row.charge.externalStatus)}>
                            {asaasPaymentStatusLabel(row.charge.externalStatus)}
                          </Badge>
                        ) : null}
                        {row.charge.syncError ? <p className="text-xs text-warning">{row.charge.syncError}</p> : null}
                        {row.charge.invoiceUrl ? (
                          <Link href={row.charge.invoiceUrl} target="_blank" rel="noreferrer" className="block text-xs font-semibold text-school-primary hover:underline">
                            Abrir fatura
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <p className="font-medium text-text-primary">{latestActionText(row)}</p>
                      {row.latestAction ? (
                        <p className="text-xs text-text-muted">{formatDateTime(row.latestAction.createdAt)}</p>
                      ) : null}
                      {row.effectivePromiseStatus ? (
                        <Badge variant={row.effectivePromiseStatus === "OVERDUE" ? "danger" : "info"}>
                          {promiseStatusLabels[row.effectivePromiseStatus]}
                        </Badge>
                      ) : null}
                    </td>
                    <td>
                      <div className="flex min-w-[260px] flex-wrap gap-2">
                        <details className="w-full rounded-md border border-border bg-surface px-2 py-1">
                          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-school-primary">
                            <PhoneCall className="h-3.5 w-3.5" />
                            Registrar contato
                          </summary>
                          <form action={registerCollectionActionAction} className="mt-3 grid gap-2">
                            <input type="hidden" name="chargeId" value={row.charge.id} />
                            <input type="hidden" name="type" value="CONTACT" />
                            <Select name="channel" defaultValue="WHATSAPP" required>
                              {Object.entries(channelLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                            <textarea
                              name="note"
                              placeholder="Resumo do contato"
                              className="min-h-20 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                            <Button type="submit" size="sm">Salvar contato</Button>
                          </form>
                        </details>
                        <form action={registerCollectionActionAction}>
                          <input type="hidden" name="chargeId" value={row.charge.id} />
                          <input type="hidden" name="type" value="CONTACTED" />
                          <ConfirmSubmitButton message="Marcar esta cobranca como contatada?" pendingLabel="Registrando..." icon="none" variant="subtle">
                            Marcar como contatado
                          </ConfirmSubmitButton>
                        </form>
                        <details className="w-full rounded-md border border-border bg-surface px-2 py-1">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-school-primary">Adicionar observacao</summary>
                          <form action={registerCollectionActionAction} className="mt-3 grid gap-2">
                            <input type="hidden" name="chargeId" value={row.charge.id} />
                            <input type="hidden" name="type" value="NOTE" />
                            <textarea
                              name="note"
                              required
                              placeholder="Observacao interna"
                              className="min-h-20 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                            <Button type="submit" size="sm">Salvar observacao</Button>
                          </form>
                        </details>
                        <details className="w-full rounded-md border border-border bg-surface px-2 py-1">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-school-primary">Registrar promessa</summary>
                          <form action={registerCollectionActionAction} className="mt-3 grid gap-2">
                            <input type="hidden" name="chargeId" value={row.charge.id} />
                            <input type="hidden" name="type" value="PAYMENT_PROMISE" />
                            <Input name="promisedDate" type="date" required />
                            <textarea
                              name="note"
                              placeholder="Combinado com o responsavel"
                              className="min-h-20 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                            <Button type="submit" size="sm">Salvar promessa</Button>
                          </form>
                        </details>
                        {row.charge.collectionActions.length ? (
                          <details className="w-full rounded-md border border-border bg-surface px-2 py-1">
                            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-school-primary">
                              <History className="h-3.5 w-3.5" />
                              Historico
                            </summary>
                            <div className="mt-3 space-y-2">
                              {row.charge.collectionActions.map((action) => (
                                <div key={action.id} className="rounded-md bg-background p-2 text-xs">
                                  <p className="font-semibold text-school-navy">{actionLabels[action.type]}</p>
                                  <p className="text-text-muted">
                                    {formatDateTime(action.createdAt)}
                                    {action.createdBy?.name ? ` - ${action.createdBy.name}` : ""}
                                  </p>
                                  {action.channel ? <p className="text-text-muted">Canal: {channelLabels[action.channel]}</p> : null}
                                  {action.promisedDate ? <p className="text-text-muted">Prometido para {formatDate(action.promisedDate)}</p> : null}
                                  {action.note ? <p className="mt-1 whitespace-normal text-text-secondary">{action.note}</p> : null}
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="Nenhuma inadimplencia encontrada" description="Nao ha cobrancas vencidas para os filtros selecionados." />
        )}
      </AdminSection>
    </main>
  );
}
