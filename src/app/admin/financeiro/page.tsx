import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, CircleDollarSign, ReceiptText } from "lucide-react";
import {
  cancelChargeAction,
  createChargeAction,
  generateExternalPaymentAction,
  markChargePaidAction,
  updateChargeAction
} from "@/app/actions/financial";
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminSection, AdminToolbar } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CurrencyInput, FinancialFilters } from "./financial-admin-controls";
import {
  billingTypeLabel,
  chargeStatusLabel,
  chargeStatusTone,
  formatCurrencyBRL,
  getChargeDisplayStatus,
  paymentProviderLabel
} from "@/lib/financial-core";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import {
  FinancialError,
  type FinancialFilterStatus,
  getAdminFinancialOverview
} from "@/services/financial";

export const dynamic = "force-dynamic";

const statusOptions: Array<{ value: FinancialFilterStatus | ""; label: string }> = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendentes" },
  { value: "OVERDUE", label: "Vencidas" },
  { value: "PAID", label: "Pagas" },
  { value: "CANCELED", label: "Canceladas" },
  { value: "REFUNDED", label: "Reembolsadas" }
];

const successMessages: Record<string, string> = {
  criada: "Cobranca criada com sucesso.",
  editada: "Cobranca atualizada com sucesso.",
  paga: "Pagamento manual registrado.",
  cancelada: "Cobranca cancelada.",
  pix: "Cobranca Pix gerada no Asaas Sandbox.",
  boleto: "Boleto gerado no Asaas Sandbox."
};

const errorMessages: Record<string, string> = {
  validacao: "Revise os campos da cobranca.",
  plano: "O financeiro esta disponivel apenas no plano Profissional.",
  aluno: "Aluno nao encontrado nesta escola.",
  matricula: "Matricula invalida para o aluno informado.",
  valor: "Informe um valor valido maior que zero.",
  data: "Informe uma data de vencimento valida.",
  status: "Esta cobranca nao permite essa acao.",
  cobranca: "Cobranca nao encontrada.",
  responsavel: "Informe um responsavel pagador para esta cobranca.",
  documento: "Responsavel sem CPF/CNPJ valido para gerar cobranca externa.",
  asaas: "Nao foi possivel concluir a integracao com o Asaas Sandbox."
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function studentLabel(student: Awaited<ReturnType<typeof getAdminFinancialOverview>>["students"][number]) {
  const enrollment = student.enrollments[0];
  if (!enrollment) return student.fullName;
  return `${student.fullName} - ${enrollment.classroom.name} - ${enrollment.academicYear.year}`;
}

export default async function AdminFinancialPage({
  searchParams
}: {
  searchParams: Promise<{
    mes?: string;
    status?: FinancialFilterStatus;
    aluno?: string;
    responsavel?: string;
    erro?: string;
    sucesso?: string;
  }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const month = query.mes || currentMonthValue();
  const status = statusOptions.some((item) => item.value === query.status) ? query.status : undefined;

  let overview: Awaited<ReturnType<typeof getAdminFinancialOverview>>;
  try {
    overview = await getAdminFinancialOverview(session.schoolId, {
      month,
      status,
      studentId: query.aluno || undefined,
      guardianId: query.responsavel || undefined
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
  const feedbackTone = query.sucesso ? "success" : "warning";

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Financeiro"
        description="Controle de cobrancas escolares com emissao opcional via Asaas Sandbox."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Financeiro" }
        ]}
      />

      {feedback ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
          <Badge variant={feedbackTone}>{feedback}</Badge>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Em aberto"
          value={formatCurrencyBRL(overview.summary.pending)}
          detail="a vencer"
          icon={CircleDollarSign}
          tone="warning"
        />
        <AdminMetric
          label="Vencidas"
          value={formatCurrencyBRL(overview.summary.overdue)}
          detail="pendentes"
          icon={CalendarClock}
          tone="danger"
        />
        <AdminMetric
          label="Pagas"
          value={formatCurrencyBRL(overview.summary.paid)}
          detail="no periodo"
          icon={CheckCircle2}
          tone="success"
        />
        <AdminMetric
          label="Cobrancas"
          value={overview.summary.count}
          detail="registros"
          icon={ReceiptText}
          tone="info"
        />
      </section>

      <AdminToolbar>
        <FinancialFilters
          month={month}
          status={status}
          studentId={query.aluno}
          guardianId={query.responsavel}
          statusOptions={statusOptions}
          students={overview.students.map((student) => ({ id: student.id, label: studentLabel(student) }))}
          guardians={overview.guardians.map((guardian) => ({ id: guardian.id, label: guardian.fullName }))}
        />
      </AdminToolbar>

      <AdminSection title="Nova cobranca" description="Crie uma cobranca interna vinculada a um aluno.">
        <form action={createChargeAction} className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_160px_180px]">
          <Select name="studentId" required defaultValue="">
            <option value="" disabled>
              Selecione o aluno
            </option>
            {overview.students.map((student) => {
              return (
                <option key={student.id} value={student.id}>
                  {studentLabel(student)}
                </option>
              );
            })}
          </Select>
          <Input name="reference" placeholder="Referencia, ex.: Mensalidade 09/2026" required />
          <CurrencyInput name="amount" required />
          <Input name="dueDate" type="date" required />
          <textarea
            name="description"
            placeholder="Descricao opcional"
            className="min-h-24 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 lg:col-span-3"
          />
          <Button type="submit" className="lg:self-start">
            Criar cobranca
          </Button>
        </form>
      </AdminSection>

      <AdminSection title="Cobrancas" description="Listagem interna para acompanhamento da secretaria.">
        {overview.charges.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Referencia</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {overview.charges.map((charge) => {
                  const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
                  const hasExternalPayment = Boolean(charge.externalPaymentId);
                  const editable = charge.status === "PENDING" && !hasExternalPayment;
                  const canGenerateExternalPayment = charge.status === "PENDING" && !hasExternalPayment && charge.externalStatus !== "CREATING";
                  return (
                    <tr key={charge.id}>
                      <td>
                        <Link href={`/admin/alunos/${charge.studentId}`} className="font-semibold text-school-navy hover:underline">
                          {charge.student.fullName}
                        </Link>
                        <p className="text-xs text-text-muted">
                          {charge.enrollment?.classroom.name ?? "Sem turma"} - {charge.guardian?.fullName ?? "Responsavel nao informado"}
                        </p>
                      </td>
                      <td>
                        <p className="font-medium text-text-primary">{charge.reference}</p>
                        {charge.description ? <p className="mt-1 max-w-[280px] whitespace-normal text-xs text-text-muted">{charge.description}</p> : null}
                      </td>
                      <td>{formatDate(charge.dueDate)}</td>
                      <td className="font-semibold text-school-navy">{formatCurrencyBRL(charge.amount)}</td>
                      <td>
                        <Badge variant={chargeStatusTone(displayStatus)}>{chargeStatusLabel(displayStatus)}</Badge>
                      </td>
                      <td>
                        {charge.provider ? (
                          <div className="space-y-1">
                            <Badge variant={charge.externalPaymentId ? "info" : "warning"}>
                              {paymentProviderLabel(charge.provider)}
                            </Badge>
                            <p className="text-xs text-text-muted">
                              {billingTypeLabel(charge.billingType)}
                              {charge.externalStatus ? ` - ${charge.externalStatus}` : ""}
                            </p>
                            {charge.invoiceUrl ? (
                              <Link href={charge.invoiceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-school-primary hover:underline">
                                Abrir fatura
                              </Link>
                            ) : null}
                            {charge.syncError ? <p className="max-w-[220px] whitespace-normal text-xs text-warning">{charge.syncError}</p> : null}
                          </div>
                        ) : charge.paidAt ? (
                          <>
                            <p>{formatDate(charge.paidAt)}</p>
                            <p className="text-xs text-text-muted">Pagamento manual</p>
                          </>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {editable ? (
                            <details className="rounded-md border border-border bg-surface px-2 py-1">
                              <summary className="cursor-pointer list-none text-xs font-semibold text-school-primary">
                                Editar
                              </summary>
                              <form action={updateChargeAction} className="mt-3 grid w-72 gap-2">
                                <input type="hidden" name="chargeId" value={charge.id} />
                                <Input name="reference" defaultValue={charge.reference} required />
                                <CurrencyInput name="amount" defaultValue={charge.amount.toString()} required />
                                <Input
                                  name="dueDate"
                                  type="date"
                                  defaultValue={charge.dueDate.toISOString().slice(0, 10)}
                                  required
                                />
                                <textarea
                                  name="description"
                                  defaultValue={charge.description ?? ""}
                                  className="min-h-20 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                                />
                                <Button type="submit" size="sm">
                                  Salvar
                                </Button>
                              </form>
                            </details>
                          ) : null}
                          {canGenerateExternalPayment ? (
                            <>
                              <form action={generateExternalPaymentAction}>
                                <input type="hidden" name="chargeId" value={charge.id} />
                                <input type="hidden" name="billingType" value="PIX" />
                                <ConfirmSubmitButton
                                  message="Gerar cobranca Pix no Asaas Sandbox?"
                                  pendingLabel="Gerando..."
                                  icon="none"
                                  variant="subtle"
                                >
                                  Gerar Pix
                                </ConfirmSubmitButton>
                              </form>
                              <form action={generateExternalPaymentAction}>
                                <input type="hidden" name="chargeId" value={charge.id} />
                                <input type="hidden" name="billingType" value="BOLETO" />
                                <ConfirmSubmitButton
                                  message="Gerar boleto no Asaas Sandbox?"
                                  pendingLabel="Gerando..."
                                  icon="none"
                                  variant="outline"
                                >
                                  Gerar Boleto
                                </ConfirmSubmitButton>
                              </form>
                            </>
                          ) : null}
                          {editable ? (
                            <form action={markChargePaidAction}>
                              <input type="hidden" name="chargeId" value={charge.id} />
                              <ConfirmSubmitButton
                                message="Registrar pagamento manual desta cobranca?"
                                pendingLabel="Registrando..."
                                icon="none"
                                variant="subtle"
                              >
                                Marcar como paga
                              </ConfirmSubmitButton>
                            </form>
                          ) : null}
                          {editable ? (
                            <form action={cancelChargeAction}>
                              <input type="hidden" name="chargeId" value={charge.id} />
                              <ConfirmSubmitButton
                                message="Cancelar esta cobranca pendente?"
                                pendingLabel="Cancelando..."
                                icon="none"
                                variant="outline"
                              >
                                Cancelar
                              </ConfirmSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="Nenhuma cobranca encontrada" description="Tente ajustar os filtros ou crie uma nova cobranca." />
        )}
      </AdminSection>
    </main>
  );
}
