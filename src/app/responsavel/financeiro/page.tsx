import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, CircleDollarSign, ReceiptText } from "lucide-react";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianMetric, GuardianPageHeader, GuardianSection } from "@/components/guardian/guardian-ui";
import { Badge } from "@/components/ui/badge";
import { chargeStatusLabel, chargeStatusTone, formatCurrencyBRL, getChargeDisplayStatus } from "@/lib/financial-core";
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
                    </div>
                    <strong className="text-2xl text-school-navy">{formatCurrencyBRL(charge.amount)}</strong>
                  </div>
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
