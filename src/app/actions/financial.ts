"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { EmailCommunicationError, sendCollectionEmail } from "@/services/email-communication";
import {
  cancelCharge,
  createCharge,
  emitBillingBatchPayments,
  FinancialError,
  generateBillingBatch,
  generateExternalPayment,
  markChargePaid,
  requestChargeRefund,
  registerCollectionAction,
  runRecurringBillingAutomation,
  saveBillingRule,
  syncChargeWithAsaas,
  updateCharge
} from "@/services/financial";

const createChargeSchema = z.object({
  studentId: z.string().min(1),
  enrollmentId: z.string().optional(),
  reference: z.string().trim().min(1),
  description: z.string().optional(),
  amount: z.string().trim().min(1),
  dueDate: z.string().trim().min(1)
});

const updateChargeSchema = createChargeSchema.omit({ studentId: true, enrollmentId: true }).extend({
  chargeId: z.string().min(1)
});

const externalPaymentSchema = z.object({
  chargeId: z.string().min(1),
  billingType: z.enum(["PIX", "BOLETO"])
});

const billingRuleSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().trim().min(1),
  amount: z.string().trim().min(1),
  dueDay: z.string().trim().min(1),
  classroomId: z.string().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  autoGenerate: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  generationDay: z.string().optional()
});

const billingBatchSchema = z.object({
  billingRuleId: z.string().min(1),
  competence: z.string().trim().min(1)
});

const emitBillingBatchSchema = billingBatchSchema.extend({
  billingType: z.enum(["PIX", "BOLETO"])
});

const billingAutomationNowSchema = z.object({
  billingRuleId: z.string().min(1)
});

const collectionActionSchema = z.object({
  chargeId: z.string().min(1),
  type: z.enum(["CONTACT", "CONTACTED", "NOTE", "PAYMENT_PROMISE"]),
  channel: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["PHONE", "WHATSAPP", "EMAIL", "IN_PERSON", "OTHER"]).optional()
  ),
  communicationType: z.string().optional(),
  messageTemplate: z.string().optional(),
  messageBody: z.string().optional(),
  note: z.string().optional(),
  promisedDate: z.string().optional()
});

const collectionEmailSchema = z.object({
  chargeId: z.string().min(1),
  communicationType: z.string().optional(),
  messageTemplate: z.string().optional(),
  messageBody: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  note: z.string().optional(),
  acknowledgedRecentContact: z.preprocess((value) => value === "on" || value === "true", z.boolean().optional())
});

function redirectWithStatus(path: string, params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`${path}?${search.toString()}`);
}

function financialErrorCode(error: unknown) {
  if (error instanceof FinancialError) return error.code;
  if (error instanceof EmailCommunicationError) return error.code;
  if (error instanceof z.ZodError) return "validacao";
  throw error;
}

function revalidateFinancialPaths(studentId?: string) {
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/mensalidades");
  revalidatePath("/admin/alunos");
  if (studentId) revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/responsavel/financeiro");
}

function recurringBillingPath(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/admin/financeiro/mensalidades?${search.toString()}`;
}

function delinquencyPath(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/admin/financeiro/inadimplencia?${search.toString()}`;
}

export async function createChargeAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = createChargeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithStatus("/admin/financeiro", { erro: "validacao" });
  }

  try {
    const chargeId = await createCharge(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths(parsed.data.studentId);
    redirectWithStatus("/admin/financeiro", { sucesso: "criada", cobranca: chargeId });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function updateChargeAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = updateChargeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithStatus("/admin/financeiro", { erro: "validacao" });
  }

  try {
    await updateCharge(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: "editada" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function markChargePaidAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const chargeId = z.string().min(1).parse(formData.get("chargeId"));

  try {
    await markChargePaid(session.schoolId, session.id, chargeId);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: "paga" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function cancelChargeAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const chargeId = z.string().min(1).parse(formData.get("chargeId"));

  try {
    await cancelCharge(session.schoolId, session.id, chargeId);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: "cancelada" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function syncChargeWithAsaasAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const chargeId = z.string().min(1).parse(formData.get("chargeId"));

  try {
    await syncChargeWithAsaas(session.schoolId, session.id, chargeId);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: "sincronizada" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function requestChargeRefundAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const chargeId = z.string().min(1).parse(formData.get("chargeId"));

  try {
    await requestChargeRefund(session.schoolId, session.id, chargeId);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: "reembolso" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function generateExternalPaymentAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = externalPaymentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithStatus("/admin/financeiro", { erro: "validacao" });
  }

  try {
    await generateExternalPayment(session.schoolId, session.id, parsed.data.chargeId, parsed.data.billingType);
    revalidateFinancialPaths();
    redirectWithStatus("/admin/financeiro", { sucesso: parsed.data.billingType === "PIX" ? "pix" : "boleto" });
  } catch (error) {
    redirectWithStatus("/admin/financeiro", { erro: financialErrorCode(error) });
  }
}

export async function registerCollectionActionAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = collectionActionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(delinquencyPath({ erro: "validacao" }));
  }

  try {
    await registerCollectionAction(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    revalidatePath("/admin/financeiro/inadimplencia");
    redirect(
      delinquencyPath({
        sucesso: parsed.data.type === "PAYMENT_PROMISE" ? "promessa" : parsed.data.type === "NOTE" ? "observacao" : "contato"
      })
    );
  } catch (error) {
    redirect(delinquencyPath({ erro: financialErrorCode(error) }));
  }
}

export async function sendCollectionEmailAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = collectionEmailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(delinquencyPath({ erro: "validacao" }));
  }

  try {
    await sendCollectionEmail(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    revalidatePath("/admin/financeiro/inadimplencia");
    redirect(delinquencyPath({ sucesso: "email" }));
  } catch (error) {
    revalidatePath("/admin/financeiro/inadimplencia");
    redirect(delinquencyPath({ erro: financialErrorCode(error) }));
  }
}

export async function saveBillingRuleAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = billingRuleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(recurringBillingPath({ erro: "validacao" }));
  }

  try {
    const ruleId = await saveBillingRule(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    redirect(recurringBillingPath({ sucesso: "regra", regra: ruleId }));
  } catch (error) {
    redirect(recurringBillingPath({ erro: financialErrorCode(error) }));
  }
}

export async function generateBillingBatchAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = billingBatchSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(recurringBillingPath({ erro: "validacao" }));
  }

  try {
    const result = await generateBillingBatch(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    redirect(
      recurringBillingPath({
        sucesso: result.created > 0 ? "lote" : "lote-sem-novos",
        regra: parsed.data.billingRuleId,
        competencia: result.competence
      })
    );
  } catch (error) {
    redirect(recurringBillingPath({ erro: financialErrorCode(error) }));
  }
}

export async function emitBillingBatchPaymentsAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = emitBillingBatchSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(recurringBillingPath({ erro: "validacao" }));
  }

  try {
    const result = await emitBillingBatchPayments(session.schoolId, session.id, parsed.data);
    revalidateFinancialPaths();
    redirect(
      recurringBillingPath({
        sucesso: result.failed > 0 ? "emissao-parcial" : "emissao",
        regra: parsed.data.billingRuleId,
        competencia: parsed.data.competence
      })
    );
  } catch (error) {
    redirect(recurringBillingPath({ erro: financialErrorCode(error) }));
  }
}

export async function runBillingAutomationNowAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = billingAutomationNowSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(recurringBillingPath({ erro: "validacao" }));
  }

  try {
    const result = await runRecurringBillingAutomation({
      schoolId: session.schoolId,
      billingRuleId: parsed.data.billingRuleId,
      trigger: "MANUAL",
      userId: session.id,
      bypassSchedule: true
    });

    if (result.failedTasks > 0) {
      redirect(recurringBillingPath({ erro: "automacao", regra: parsed.data.billingRuleId, competencia: result.competence }));
    }

    redirect(
      recurringBillingPath({
        sucesso: result.generatedTasks > 0 ? "automacao" : "automacao-sem-novos",
        regra: parsed.data.billingRuleId,
        competencia: result.competence
      })
    );
  } catch (error) {
    redirect(recurringBillingPath({ erro: financialErrorCode(error), regra: parsed.data.billingRuleId }));
  }
}
