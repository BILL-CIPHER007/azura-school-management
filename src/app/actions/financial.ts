"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  cancelCharge,
  createCharge,
  FinancialError,
  markChargePaid,
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
  revalidatePath("/admin/alunos");
  if (studentId) revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/responsavel/financeiro");
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
