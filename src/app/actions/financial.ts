"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  cancelCharge,
  createCharge,
  emitBillingBatchPayments,
  FinancialError,
  generateBillingBatch,
  generateExternalPayment,
  markChargePaid,
  requestChargeRefund,
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
  isActive: z.preprocess((value) => value === "on" || value === true, z.boolean())
});

const billingBatchSchema = z.object({
  billingRuleId: z.string().min(1),
  competence: z.string().trim().min(1)
});

const emitBillingBatchSchema = billingBatchSchema.extend({
  billingType: z.enum(["PIX", "BOLETO"])
});

function redirectWithStatus(path: string, params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`${path}?${search.toString()}`);
}

function financialErrorCode(error: unknown) {
  if (error instanceof FinancialError) return error.code;
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
