import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, CircleDollarSign, ReceiptText } from "lucide-react";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { Badge } from "@/components/ui/badge";
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
import { FinancialError, getGuardianFinancialPortal } from "@/services/financial";

export const dynamic = "force-dynamic";

export default async function GuardianFinancialPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requireSession(["RESPONSAVEL"]);
  const query = await searchParams;

  let portal: Awaited<ReturnType<typeof getGuardianFinancialPortal>>;
  try {
    portal = await getGuardianFinancialPortal(session.schoolId, session.id, query.studentId);
  } catch (error) {
    if (error instanceof FinancialError && error.code === "plano") {
      redirect("/responsavel/dashboard");
    }
    throw error;
  }

  const summary = portal.charges.reduce(
    (accumulator, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      const amount = Number(charge.amount);
      if (displayStatus === "PENDING") accumulator.pending += amount;
      if (displayStatus === "OVERDUE") accumulator.overdue += amount;
      if (displayStatus === "PAID") accumulator.paid += amount;
      accumulator.count += 1;
      return accumulator;
    },
    { pending: 0, overdue: 0, paid: 0, count: 0 }
  );
  const classroom = portal.selectedStudent?.enrollments[0]?.classroom;
  const year = portal.selectedStudent?.enrollments[0]?.academicYear.year;

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Financeiro"
          description="Consulte as cobrancas escolares registradas pela secretaria."
          eyebrow={
            portal.selectedStudent
              ? `${portal.selectedStudent.fullName}${classroom ? ` - ${classroom.name}` : ""}${year ? ` - ${year}` : ""}`
              : "Area do responsavel"
          }
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuardianMetric label="Em aberto" value={formatCurrencyBRL(summary.pending)} detail="a vencer" icon={CircleDollarSign} tone="warning" />
        <GuardianMetric label="Vencidas" value={formatCurrencyBRL(summary.overdue)} detail="pendentes" icon={CalendarClock} tone="warning" />
        <GuardianMetric label="Pagas" value={formatCurrencyBRL(summary.paid)} detail="registradas" icon={CheckCircle2} tone="success" />
        <GuardianMetric label="Cobrancas" value={summary.count} detail="total do aluno" icon={ReceiptText} tone="info" />
      </section>

      <GuardianSection title="Cobrancas do aluno" description="Valores informados pela escola para acompanhamento familiar.">
        {!portal.selectedStudent ? (
          <GuardianEmptyState title="Nenhum aluno vinculado" description="Quando houver um aluno vinculado, as cobrancas aparecerao aqui." />
        ) : portal.charges.length ? (
          <div className="grid gap-3">
            {portal.charges.map((charge) => {
              const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
              const pixInstruction = portal.pixInstructions[charge.id];
              return (
                <article key={charge.id} className="rounded-lg border border-border bg-surface-muted/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-school-navy">{charge.reference}</h2>
                        <Badge variant={chargeStatusTone(displayStatus)}>{chargeStatusLabel(displayStatus)}</Badge>
                      </div>
                      {charge.description ? <p className="mt-2 text-sm leading-6 text-text-secondary">{charge.description}</p> : null}
                      <p className="mt-2 text-sm text-text-muted">
                        Vencimento em {formatDate(charge.dueDate)}
                        {charge.paidAt ? ` - pago em ${formatDate(charge.paidAt)}` : ""}
                      </p>
                      {charge.enrollment?.classroom ? (
                        <p className="mt-1 text-xs text-text-muted">
                          {charge.enrollment.classroom.name} - Ano letivo {charge.enrollment.academicYear.year}
                        </p>
                      ) : null}
                      {charge.provider ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <Badge variant="info">{paymentProviderLabel(charge.provider)}</Badge>
                          <span>{billingTypeLabel(charge.billingType)}</span>
                          {charge.externalStatus ? <span>Status externo: {charge.externalStatus}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <strong className="text-2xl text-school-navy">{formatCurrencyBRL(charge.amount)}</strong>
                  </div>
                  {charge.invoiceUrl ? (
                    <div className="mt-4 rounded-md border border-border bg-surface p-3">
                      <p className="text-sm font-semibold text-school-navy">Fatura oficial</p>
                      <a href={charge.invoiceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-school-primary hover:underline">
                        Abrir fatura de pagamento
                      </a>
                    </div>
                  ) : null}
                  {pixInstruction?.pix ? (
                    <div className="mt-4 grid gap-4 rounded-md border border-school-blue-100 bg-school-primary-soft/50 p-4 md:grid-cols-[160px_1fr]">
                      <Image
                        src={`data:image/png;base64,${pixInstruction.pix.encodedImage}`}
                        alt="QR Code Pix"
                        width={160}
                        height={160}
                        unoptimized
                        className="h-40 w-40 rounded-md border border-border bg-white object-contain p-2"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-school-navy">Pix Copia e Cola</p>
                        {pixInstruction.pix.expirationDate ? (
                          <p className="mt-1 text-xs text-text-muted">Expira em {formatDate(new Date(pixInstruction.pix.expirationDate))}</p>
                        ) : null}
                        <textarea
                          readOnly
                          value={pixInstruction.pix.payload}
                          className="mt-3 min-h-24 w-full rounded-md border border-input bg-surface px-3 py-2 text-xs text-text-secondary shadow-sm"
                        />
                      </div>
                    </div>
                  ) : pixInstruction?.error ? (
                    <div className="mt-4 rounded-md border border-warning/20 bg-warning-soft p-3 text-sm text-warning">
                      {pixInstruction.error}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <GuardianEmptyState
            title="Nenhuma cobranca encontrada"
            description="Cobrancas registradas pela escola para este aluno aparecerao aqui."
          />
        )}
      </GuardianSection>
    </main>
  );
}
