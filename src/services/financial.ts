import { Prisma } from "@prisma/client";
import type { ChargeStatus, ExternalBillingType, FinancialEventSource } from "@prisma/client";
import {
  AsaasClientError,
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByExternalReference,
  findAsaasPaymentByExternalReference,
  getAsaasPayment,
  getAsaasPixQrCode,
  refundAsaasPayment,
  type AsaasBillingType,
  type AsaasPayment,
  type AsaasPixQrCode,
  type AsaasWebhookPayload
} from "@/lib/asaas-client";
import { hasCommercialFeature } from "@/lib/commercial-plans";
import {
  billingCompetenceLabel,
  canCancelAsaasPaymentStatus,
  canRequestRefund,
  dateFromCivilInput,
  dueDateFromBillingCompetence,
  getChargeDisplayStatus,
  nextChargeStatusFromAsaas,
  normalizeBillingCompetence,
  normalizeAsaasPaymentStatus,
  parseCurrencyInput,
  toCivilDateKey,
  todayCivilDate
} from "@/lib/financial-core";
import { prisma } from "@/lib/prisma";

export type FinancialFilterStatus = ChargeStatus | "OVERDUE";

export type ChargeFormInput = {
  studentId: string;
  enrollmentId?: string;
  reference: string;
  description?: string;
  amount: string;
  dueDate: string;
};

export type ChargeUpdateInput = {
  chargeId: string;
  reference: string;
  description?: string;
  amount: string;
  dueDate: string;
};

export class FinancialError extends Error {
  constructor(
    public code:
      | "plano"
      | "aluno"
      | "matricula"
      | "valor"
      | "data"
      | "status"
      | "cobranca"
      | "responsavel"
      | "documento"
      | "asaas"
      | "regra"
      | "competencia"
      | "lote"
      | "emissao",
    message: string
  ) {
    super(message);
    this.name = "FinancialError";
  }
}

type TransactionClient = Prisma.TransactionClient;

type FinancialHistoryInput = {
  schoolId: string;
  chargeId: string;
  userId?: string | null;
  source: FinancialEventSource;
  action: string;
  previousStatus?: ChargeStatus | null;
  nextStatus?: ChargeStatus | null;
  previousExternalStatus?: string | null;
  nextExternalStatus?: string | null;
  message?: string | null;
  externalEventId?: string | null;
};

async function recordFinancialEvent(tx: TransactionClient | typeof prisma, input: FinancialHistoryInput) {
  await tx.chargeFinancialEvent.create({
    data: {
      schoolId: input.schoolId,
      chargeId: input.chargeId,
      userId: input.userId ?? null,
      source: input.source,
      action: input.action,
      previousStatus: input.previousStatus ?? null,
      nextStatus: input.nextStatus ?? null,
      previousExternalStatus: input.previousExternalStatus ?? null,
      nextExternalStatus: input.nextExternalStatus ?? null,
      message: input.message?.slice(0, 240) ?? null,
      externalEventId: input.externalEventId ?? null
    }
  });
}

export async function getFinancialFeatureAccess(schoolId: string) {
  const school = await prisma.school.findFirstOrThrow({
    where: { id: schoolId },
    select: { plan: true }
  });

  return hasCommercialFeature(school.plan, "finance");
}

export async function assertFinancialFeature(schoolId: string, tx: TransactionClient | typeof prisma = prisma) {
  const school = await tx.school.findFirstOrThrow({
    where: { id: schoolId },
    select: { plan: true }
  });

  if (!hasCommercialFeature(school.plan, "finance")) {
    throw new FinancialError("plano", "O financeiro esta disponivel apenas no plano Profissional.");
  }

  return school.plan;
}

function chargeWhereByStatus(status?: FinancialFilterStatus): Prisma.ChargeWhereInput {
  if (!status) return {};
  if (status === "OVERDUE") {
    return {
      status: "PENDING",
      dueDate: { lt: todayCivilDate() }
    };
  }
  if (status === "PENDING") {
    return {
      status: "PENDING",
      dueDate: { gte: todayCivilDate() }
    };
  }
  return { status };
}

function parseChargeInput(input: ChargeFormInput | ChargeUpdateInput) {
  const amount = parseCurrencyInput(input.amount);
  const dueDate = dateFromCivilInput(input.dueDate);
  const reference = input.reference.trim();
  const description = input.description?.trim() || null;

  if (!reference) throw new FinancialError("cobranca", "Informe a referencia da cobranca.");
  if (!amount) throw new FinancialError("valor", "Informe um valor valido maior que zero.");
  if (!dueDate) throw new FinancialError("data", "Informe uma data de vencimento valida.");

  return { amount, dueDate, reference, description };
}

async function resolveChargeStudent(tx: TransactionClient, schoolId: string, studentId: string, enrollmentId?: string) {
  const student = await tx.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      guardians: {
        where: { guardian: { schoolId } },
        include: { guardian: true },
        orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }]
      },
      enrollments: {
        where: enrollmentId ? { id: enrollmentId, schoolId } : { schoolId, status: "ACTIVE" },
        orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
        take: 1
      }
    }
  });

  if (!student) throw new FinancialError("aluno", "Aluno nao encontrado nesta escola.");
  const enrollment = student.enrollments[0] ?? null;
  if (enrollmentId && !enrollment) throw new FinancialError("matricula", "Matricula nao pertence ao aluno informado.");

  return {
    student,
    enrollmentId: enrollment?.id ?? null,
    guardianId: student.guardians[0]?.guardianId ?? null
  };
}

function onlyDigits(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function validCpfCnpj(value?: string | null) {
  const digits = onlyDigits(value);
  return digits.length === 11 || digits.length === 14 ? digits : null;
}

function externalCustomerReference(schoolId: string, guardianId: string) {
  return `azura:${schoolId}:guardian:${guardianId}`;
}

function externalChargeReference(chargeId: string) {
  return `azura:charge:${chargeId}`;
}

function summarizeIntegrationError(error: unknown) {
  if (error instanceof FinancialError || error instanceof AsaasClientError) return error.message.slice(0, 240);
  if (error instanceof Error) return error.message.slice(0, 240);
  return "Nao foi possivel concluir a integracao externa.";
}

function parseAsaasPaymentObjectDate(payment: AsaasPayment) {
  const value = payment.paymentDate ?? payment.clientPaymentDate ?? payment.confirmedDate;
  if (!value) return new Date();

  const parsed = dateFromCivilInput(value);
  const fallback = new Date(value);
  if (parsed) return parsed;
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

async function applyAsaasPaymentSnapshot(
  tx: TransactionClient,
  input: {
    charge: {
      id: string;
      schoolId: string;
      status: ChargeStatus;
      externalStatus: string | null;
      paidAt?: Date | null;
      canceledAt?: Date | null;
      refundedAt?: Date | null;
    };
    payment: AsaasPayment;
    source: FinancialEventSource;
    userId?: string | null;
    action: string;
    message?: string | null;
    externalEventId?: string | null;
  }
) {
  const externalStatus = input.payment.deleted ? "DELETED" : input.payment.status ?? null;
  const nextStatus = nextChargeStatusFromAsaas(input.charge.status, externalStatus);
  const normalized = normalizeAsaasPaymentStatus(externalStatus);
  const updateData: Prisma.ChargeUpdateInput = {
    externalStatus,
    lastSyncedAt: new Date(),
    syncError: null
  };

  if (nextStatus) {
    updateData.status = nextStatus;
    if (nextStatus === "PAID" && !input.charge.paidAt) updateData.paidAt = parseAsaasPaymentObjectDate(input.payment);
    if (nextStatus === "CANCELED" && !input.charge.canceledAt) updateData.canceledAt = new Date();
    if (nextStatus === "REFUNDED" && !input.charge.refundedAt) updateData.refundedAt = new Date();
  }

  if (normalized === "REFUND_IN_PROGRESS" || normalized === "REFUND_REQUESTED") {
    updateData.refundRequestedAt = new Date();
  }

  await tx.charge.update({
    where: { id: input.charge.id },
    data: updateData
  });

  await recordFinancialEvent(tx, {
    schoolId: input.charge.schoolId,
    chargeId: input.charge.id,
    userId: input.userId ?? null,
    source: input.source,
    action: input.action,
    previousStatus: input.charge.status,
    nextStatus: nextStatus ?? input.charge.status,
    previousExternalStatus: input.charge.externalStatus,
    nextExternalStatus: externalStatus,
    message: input.message ?? "Sincronizacao com Asaas concluida.",
    externalEventId: input.externalEventId ?? null
  });

  return {
    nextStatus: nextStatus ?? input.charge.status,
    externalStatus
  };
}

async function upsertExternalCustomerMapping(schoolId: string, guardianId: string, externalCustomerId: string) {
  return prisma.guardianExternalCustomer.upsert({
    where: {
      schoolId_guardianId_provider: {
        schoolId,
        guardianId,
        provider: "ASAAS"
      }
    },
    update: { externalCustomerId },
    create: {
      schoolId,
      guardianId,
      provider: "ASAAS",
      externalCustomerId
    }
  });
}

async function ensureAsaasCustomer(schoolId: string, guardian: { id: string; fullName: string; cpf: string | null; email: string | null; phone: string | null }) {
  const mapped = await prisma.guardianExternalCustomer.findUnique({
    where: {
      schoolId_guardianId_provider: {
        schoolId,
        guardianId: guardian.id,
        provider: "ASAAS"
      }
    }
  });

  if (mapped) return mapped.externalCustomerId;

  const cpfCnpj = validCpfCnpj(guardian.cpf);
  if (!cpfCnpj) {
    throw new FinancialError("documento", "Responsavel sem CPF/CNPJ valido para gerar cobranca externa.");
  }

  const externalReference = externalCustomerReference(schoolId, guardian.id);
  const existingCustomer = await findAsaasCustomerByExternalReference(externalReference);
  const customer =
    existingCustomer ??
    (await createAsaasCustomer({
      name: guardian.fullName,
      cpfCnpj,
      email: guardian.email,
      mobilePhone: onlyDigits(guardian.phone) || undefined,
      externalReference
    }));

  await upsertExternalCustomerMapping(schoolId, guardian.id, customer.id);
  return customer.id;
}

async function findOrCreateAsaasPayment(input: {
  customerId: string;
  chargeId: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: Date;
  description?: string | null;
}) {
  const externalReference = externalChargeReference(input.chargeId);
  const existingPayment = await findAsaasPaymentByExternalReference(externalReference);
  if (existingPayment) return existingPayment;

  try {
    return await createAsaasPayment({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      dueDate: toCivilDateKey(input.dueDate),
      description: input.description,
      externalReference
    });
  } catch (error) {
    if (error instanceof AsaasClientError && (error.code === "timeout" || error.code === "request")) {
      const recoveredPayment = await findAsaasPaymentByExternalReference(externalReference);
      if (recoveredPayment) return recoveredPayment;
    }
    throw error;
  }
}

export async function createCharge(schoolId: string, userId: string, input: ChargeFormInput) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const parsed = parseChargeInput(input);
    const studentContext = await resolveChargeStudent(tx, schoolId, input.studentId, input.enrollmentId || undefined);

    const charge = await tx.charge.create({
      data: {
        schoolId,
        studentId: studentContext.student.id,
        guardianId: studentContext.guardianId,
        enrollmentId: studentContext.enrollmentId,
        reference: parsed.reference,
        description: parsed.description,
        amount: parsed.amount,
        dueDate: parsed.dueDate
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.created",
        entity: "Charge",
        entityId: charge.id
      }
    });

    await recordFinancialEvent(tx, {
      schoolId,
      userId,
      chargeId: charge.id,
      source: "ADMIN",
      action: "financial_charge.created",
      nextStatus: "PENDING",
      message: "Cobranca criada pela secretaria."
    });

    return charge.id;
  });
}

export async function generateExternalPayment(
  schoolId: string,
  userId: string,
  chargeId: string,
  billingType: ExternalBillingType
) {
  await assertFinancialFeature(schoolId);

  const charge = await prisma.charge.findFirst({
    where: { id: chargeId, schoolId },
    include: {
      guardian: true,
      student: true
    }
  });

  if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
  if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem gerar pagamento externo.");
  if (charge.externalPaymentId) throw new FinancialError("status", "Esta cobranca ja possui pagamento externo.");
  if (charge.externalStatus === "CREATING") throw new FinancialError("status", "A integracao desta cobranca ja esta em andamento.");
  if (!charge.guardian) throw new FinancialError("responsavel", "Informe um responsavel pagador antes de gerar pagamento externo.");

  const reserved = await prisma.charge.updateMany({
    where: {
      id: charge.id,
      schoolId,
      status: "PENDING",
      externalPaymentId: null,
      OR: [{ externalStatus: null }, { externalStatus: { not: "CREATING" } }]
    },
    data: {
      provider: "ASAAS",
      billingType,
      externalStatus: "CREATING",
      syncError: null
    }
  });

  if (reserved.count !== 1) {
    throw new FinancialError("status", "A cobranca ja esta sendo processada. Aguarde e tente novamente.");
  }

  try {
    const customerId = await ensureAsaasCustomer(schoolId, charge.guardian);
    const payment = await findOrCreateAsaasPayment({
      customerId,
      chargeId: charge.id,
      billingType,
      value: Number(charge.amount),
      dueDate: charge.dueDate,
      description: charge.description ?? charge.reference
    });

    await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: {
          provider: "ASAAS",
          externalPaymentId: payment.id,
          billingType,
          invoiceUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
          externalStatus: payment.status ?? null,
          lastSyncedAt: new Date(),
          syncError: null
        }
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "financial_charge.external_payment_created",
          entity: "Charge",
          entityId: charge.id
        }
      });

      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.external_payment_created",
        previousStatus: charge.status,
        nextStatus: "PENDING",
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: payment.status ?? null,
        message: `${billingType} gerado no Asaas Sandbox.`
      });
    });

    return charge.id;
  } catch (error) {
    await prisma.charge.update({
      where: { id: charge.id },
      data: {
        provider: "ASAAS",
        billingType,
        externalStatus: "ERROR",
        syncError: summarizeIntegrationError(error)
      }
    });

    await recordFinancialEvent(prisma, {
      schoolId,
      userId,
      chargeId: charge.id,
      source: "ADMIN",
      action: "financial_charge.external_payment_failed",
      previousStatus: charge.status,
      nextStatus: charge.status,
      previousExternalStatus: charge.externalStatus,
      nextExternalStatus: "ERROR",
      message: summarizeIntegrationError(error)
    });

    throw new FinancialError("asaas", summarizeIntegrationError(error));
  }
}

export async function updateCharge(schoolId: string, userId: string, input: ChargeUpdateInput) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const parsed = parseChargeInput(input);
    const charge = await tx.charge.findFirst({ where: { id: input.chargeId, schoolId } });

    if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
    if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser editadas.");
    if (charge.externalPaymentId) {
      throw new FinancialError("status", "Cobrancas integradas ao Asaas nao podem ser editadas localmente.");
    }

    await tx.charge.update({
      where: { id: charge.id },
      data: {
        reference: parsed.reference,
        description: parsed.description,
        amount: parsed.amount,
        dueDate: parsed.dueDate
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.updated",
        entity: "Charge",
        entityId: charge.id
      }
    });

    await recordFinancialEvent(tx, {
      schoolId,
      userId,
      chargeId: charge.id,
      source: "ADMIN",
      action: "financial_charge.updated",
      previousStatus: charge.status,
      nextStatus: charge.status,
      previousExternalStatus: charge.externalStatus,
      nextExternalStatus: charge.externalStatus,
      message: "Dados internos da cobranca atualizados."
    });
  });
}

export async function markChargePaid(schoolId: string, userId: string, chargeId: string) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const charge = await tx.charge.findFirst({ where: { id: chargeId, schoolId } });

    if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
    if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser pagas manualmente.");
    if (charge.externalPaymentId) {
      throw new FinancialError("status", "Cobrancas integradas ao Asaas devem ser confirmadas por webhook.");
    }

    await tx.charge.update({
      where: { id: charge.id },
      data: { status: "PAID", paidAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.manual_payment",
        entity: "Charge",
        entityId: charge.id
      }
    });

    await recordFinancialEvent(tx, {
      schoolId,
      userId,
      chargeId: charge.id,
      source: "ADMIN",
      action: "financial_charge.manual_payment",
      previousStatus: charge.status,
      nextStatus: "PAID",
      previousExternalStatus: charge.externalStatus,
      nextExternalStatus: charge.externalStatus,
      message: "Pagamento manual registrado pela secretaria."
    });
  });
}

export async function cancelCharge(schoolId: string, userId: string, chargeId: string) {
  await assertFinancialFeature(schoolId);
  const charge = await prisma.charge.findFirst({ where: { id: chargeId, schoolId } });

  if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
  if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser canceladas.");

  if (!charge.externalPaymentId) {
    return prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: { status: "CANCELED", canceledAt: new Date() }
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "financial_charge.canceled",
          entity: "Charge",
          entityId: charge.id
        }
      });

      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.canceled",
        previousStatus: charge.status,
        nextStatus: "CANCELED",
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: charge.externalStatus,
        message: "Cobranca interna cancelada pela secretaria."
      });
    });
  }

  let externalPayment: AsaasPayment;
  try {
    externalPayment = await getAsaasPayment(charge.externalPaymentId);
  } catch (error) {
    const message = summarizeIntegrationError(error);
    await prisma.$transaction(async (tx) => {
      await tx.charge.update({ where: { id: charge.id }, data: { syncError: message } });
      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.cancel_failed",
        previousStatus: charge.status,
        nextStatus: charge.status,
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: charge.externalStatus,
        message
      });
    });
    throw new FinancialError("asaas", message);
  }

  if (!canCancelAsaasPaymentStatus(externalPayment.status)) {
    await prisma.$transaction(async (tx) => {
      await applyAsaasPaymentSnapshot(tx, {
        charge,
        payment: externalPayment,
        source: "ADMIN",
        userId,
        action: "financial_charge.cancel_blocked",
        message: "Cancelamento bloqueado porque o status atual no Asaas nao permite a operacao."
      });
    });
    throw new FinancialError("status", "O status atual no Asaas nao permite cancelar esta cobranca.");
  }

  await recordFinancialEvent(prisma, {
    schoolId,
    userId,
    chargeId: charge.id,
    source: "ADMIN",
    action: "financial_charge.cancel_requested",
    previousStatus: charge.status,
    nextStatus: charge.status,
    previousExternalStatus: charge.externalStatus,
    nextExternalStatus: externalPayment.status ?? null,
    message: "Cancelamento solicitado ao Asaas Sandbox."
  });

  try {
    const deletedPayment = await deleteAsaasPayment(charge.externalPaymentId);
    if (!deletedPayment.deleted) throw new FinancialError("asaas", "O Asaas nao confirmou a remocao da cobranca.");

    await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          externalStatus: "DELETED",
          lastSyncedAt: new Date(),
          syncError: null
        }
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "financial_charge.external_canceled",
          entity: "Charge",
          entityId: charge.id
        }
      });

      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.external_canceled",
        previousStatus: charge.status,
        nextStatus: "CANCELED",
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: "DELETED",
        message: "Cobranca removida no Asaas Sandbox e cancelada na Azura."
      });
    });
  } catch (error) {
    const message = summarizeIntegrationError(error);
    await prisma.$transaction(async (tx) => {
      await tx.charge.update({ where: { id: charge.id }, data: { syncError: message } });
      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.cancel_failed",
        previousStatus: charge.status,
        nextStatus: charge.status,
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: externalPayment.status ?? null,
        message
      });
    });
    throw new FinancialError("asaas", message);
  }
}

export async function syncChargeWithAsaas(schoolId: string, userId: string, chargeId: string) {
  await assertFinancialFeature(schoolId);
  const charge = await prisma.charge.findFirst({ where: { id: chargeId, schoolId } });

  if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
  if (charge.provider !== "ASAAS" || !charge.externalPaymentId) {
    throw new FinancialError("status", "Somente cobrancas integradas ao Asaas podem ser sincronizadas.");
  }

  try {
    const payment = await getAsaasPayment(charge.externalPaymentId);

    await prisma.$transaction(async (tx) => {
      await applyAsaasPaymentSnapshot(tx, {
        charge,
        payment,
        source: "RECONCILIATION",
        userId,
        action: "financial_charge.reconciled",
        message: "Conciliacao individual executada pela secretaria."
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "financial_charge.reconciled",
          entity: "Charge",
          entityId: charge.id
        }
      });
    });
  } catch (error) {
    const message = summarizeIntegrationError(error);
    await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: { syncError: message }
      });
      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "RECONCILIATION",
        action: "financial_charge.reconciliation_failed",
        previousStatus: charge.status,
        nextStatus: charge.status,
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: charge.externalStatus,
        message
      });
    });
    throw new FinancialError("asaas", message);
  }
}

export async function requestChargeRefund(schoolId: string, userId: string, chargeId: string) {
  await assertFinancialFeature(schoolId);
  const charge = await prisma.charge.findFirst({ where: { id: chargeId, schoolId } });

  if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
  if (charge.provider !== "ASAAS" || !charge.externalPaymentId) {
    throw new FinancialError("status", "Somente cobrancas integradas ao Asaas podem ser reembolsadas.");
  }
  if (!canRequestRefund(charge.status, charge.billingType, charge.externalStatus)) {
    throw new FinancialError("status", "Esta cobranca nao esta em um estado seguro para solicitar reembolso.");
  }

  try {
    const payment = await getAsaasPayment(charge.externalPaymentId);
    if (!canRequestRefund(charge.status, charge.billingType, payment.status)) {
      await prisma.$transaction(async (tx) => {
        await applyAsaasPaymentSnapshot(tx, {
          charge,
          payment,
          source: "ADMIN",
          userId,
          action: "financial_charge.refund_blocked",
          message: "Reembolso bloqueado porque o status atual no Asaas nao permite a operacao."
        });
      });
      throw new FinancialError("status", "O status atual no Asaas nao permite solicitar reembolso.");
    }

    await recordFinancialEvent(prisma, {
      schoolId,
      userId,
      chargeId: charge.id,
      source: "ADMIN",
      action: "financial_charge.refund_requested",
      previousStatus: charge.status,
      nextStatus: charge.status,
      previousExternalStatus: charge.externalStatus,
      nextExternalStatus: payment.status ?? null,
      message: "Reembolso total solicitado ao Asaas Sandbox."
    });

    const refund = await refundAsaasPayment(charge.externalPaymentId, {
      description: `Reembolso da cobranca ${charge.reference}`
    });

    await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: {
          externalStatus: refund.status ?? "REFUND_REQUESTED",
          refundRequestedAt: new Date(),
          lastSyncedAt: new Date(),
          syncError: null
        }
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "financial_charge.refund_requested",
          entity: "Charge",
          entityId: charge.id
        }
      });

      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.refund_request_accepted",
        previousStatus: charge.status,
        nextStatus: charge.status,
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: refund.status ?? "REFUND_REQUESTED",
        message: "Solicitacao de reembolso aceita pelo Asaas Sandbox."
      });
    });
  } catch (error) {
    if (error instanceof FinancialError) throw error;
    const message = summarizeIntegrationError(error);
    await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: { syncError: message }
      });
      await recordFinancialEvent(tx, {
        schoolId,
        userId,
        chargeId: charge.id,
        source: "ADMIN",
        action: "financial_charge.refund_failed",
        previousStatus: charge.status,
        nextStatus: charge.status,
        previousExternalStatus: charge.externalStatus,
        nextExternalStatus: charge.externalStatus,
        message
      });
    });
    throw new FinancialError("asaas", message);
  }
}

export async function getAdminFinancialOverview(
  schoolId: string,
  filters: { month?: string; status?: FinancialFilterStatus; studentId?: string; guardianId?: string } = {}
) {
  await assertFinancialFeature(schoolId);

  const monthMatch = filters.month?.match(/^(\d{4})-(\d{2})$/);
  const monthStart = monthMatch ? dateFromCivilInput(`${filters.month}-01`) : null;
  const monthEnd = monthStart ? new Date(Date.UTC(Number(monthMatch?.[1]), Number(monthMatch?.[2]), 1, 12)) : null;

  const chargeWhere: Prisma.ChargeWhereInput = {
    schoolId,
    studentId: filters.studentId || undefined,
    guardianId: filters.guardianId || undefined,
    dueDate: monthStart && monthEnd ? { gte: monthStart, lt: monthEnd } : undefined,
    ...chargeWhereByStatus(filters.status)
  };

  const [charges, students, guardians, summaryCharges] = await Promise.all([
    prisma.charge.findMany({
      where: chargeWhere,
      include: {
        student: true,
        guardian: true,
        enrollment: { include: { classroom: true, academicYear: true } },
        financialEvents: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 6
        }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.student.findMany({
      where: { schoolId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { classroom: true, academicYear: true },
          orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
          take: 1
        }
      },
      orderBy: { fullName: "asc" }
    }),
    prisma.guardian.findMany({
      where: { schoolId },
      orderBy: { fullName: "asc" }
    }),
    prisma.charge.findMany({
      where: {
        schoolId,
        dueDate: monthStart && monthEnd ? { gte: monthStart, lt: monthEnd } : undefined
      },
      select: { amount: true, dueDate: true, status: true }
    })
  ]);

  const summary = summaryCharges.reduce(
    (accumulator, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      const amount = Number(charge.amount);
      if (displayStatus === "OVERDUE") accumulator.overdue += amount;
      if (displayStatus === "PENDING") accumulator.pending += amount;
      if (displayStatus === "PAID") accumulator.paid += amount;
      accumulator.count += 1;
      return accumulator;
    },
    { pending: 0, overdue: 0, paid: 0, count: 0 }
  );

  return { charges, students, guardians, summary };
}

export async function getStudentFinancialSummary(schoolId: string, studentId: string) {
  if (!(await getFinancialFeatureAccess(schoolId))) return null;

  const charges = await prisma.charge.findMany({
    where: { schoolId, studentId },
    select: { amount: true, dueDate: true, status: true }
  });

  return charges.reduce(
    (summary, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      if (displayStatus === "PENDING" || displayStatus === "OVERDUE") {
        summary.openAmount += Number(charge.amount);
      }
      summary.count += 1;
      return summary;
    },
    { count: 0, openAmount: 0 }
  );
}

type BillingClient = TransactionClient | typeof prisma;
type BillingRuleWithClassroom = Prisma.BillingRuleGetPayload<{ include: { classroom: true } }>;
type BillingEnrollment = Prisma.EnrollmentGetPayload<{
  include: {
    academicYear: true;
    classroom: true;
    student: {
      include: {
        guardians: {
          include: { guardian: true };
        };
      };
    };
  };
}>;

export type BillingRuleFormInput = {
  ruleId?: string;
  name: string;
  amount: string;
  dueDay: string;
  classroomId?: string;
  startsOn?: string;
  endsOn?: string;
  notes?: string;
  isActive?: boolean;
};

export type BillingPreviewRow = {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  classroomName: string;
  academicYear: number;
  guardianId: string | null;
  guardianName: string | null;
  hasPaymentGuardian: boolean;
  existingChargeId: string | null;
  existingStatus: ChargeStatus | null;
  canGenerate: boolean;
  situation: "READY" | "EXISTS" | "NO_PAYMENT_GUARDIAN";
};

export type BillingPreview = {
  competence: string;
  competenceLabel: string;
  dueDate: Date;
  amount: string;
  canGenerate: boolean;
  rangeWarning: string | null;
  summary: {
    totalStudents: number;
    eligibleStudents: number;
    skippedStudents: number;
    existingCharges: number;
    missingPaymentGuardian: number;
    predictedAmount: number;
  };
  rows: BillingPreviewRow[];
};

function parseOptionalCivilDate(value?: string) {
  if (!value?.trim()) return null;
  const parsed = dateFromCivilInput(value.trim());
  if (!parsed) throw new FinancialError("data", "Informe uma data valida.");
  return parsed;
}

function currentBillingCompetence() {
  const today = todayCivilDate();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseBillingRuleInput(input: BillingRuleFormInput) {
  const amount = parseCurrencyInput(input.amount);
  const dueDay = Number(input.dueDay);
  const name = input.name.trim();
  const classroomId = input.classroomId?.trim() || null;
  const startsOn = parseOptionalCivilDate(input.startsOn);
  const endsOn = parseOptionalCivilDate(input.endsOn);

  if (!name) throw new FinancialError("regra", "Informe o nome da mensalidade.");
  if (!amount) throw new FinancialError("valor", "Informe um valor valido maior que zero.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new FinancialError("data", "Informe um dia de vencimento entre 1 e 31.");
  }
  if (startsOn && endsOn && startsOn > endsOn) {
    throw new FinancialError("data", "A data inicial nao pode ser posterior a data final.");
  }

  return {
    name,
    amount,
    dueDay,
    classroomId,
    targetScope: classroomId ? ("CLASSROOM" as const) : ("SCHOOL" as const),
    startsOn,
    endsOn,
    notes: input.notes?.trim() || null,
    isActive: input.isActive ?? true
  };
}

function ensureBillingCompetence(value?: string | null) {
  const competence = normalizeBillingCompetence(value || currentBillingCompetence());
  if (!competence) throw new FinancialError("competencia", "Informe uma competencia valida.");
  return competence;
}

async function getActiveAcademicYearForBilling(tx: BillingClient, schoolId: string) {
  const activeYear = await tx.academicYear.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { year: "desc" }
  });

  if (activeYear) return activeYear;

  return tx.academicYear.findFirst({
    where: { schoolId },
    orderBy: { year: "desc" }
  });
}

async function resolveBillingRule(tx: BillingClient, schoolId: string, billingRuleId: string) {
  const rule = await tx.billingRule.findFirst({
    where: { id: billingRuleId, schoolId },
    include: { classroom: true }
  });

  if (!rule) throw new FinancialError("regra", "Regra de mensalidade nao encontrada.");
  return rule;
}

function getBillingRuleRangeWarning(rule: BillingRuleWithClassroom, dueDate: Date) {
  if (rule.startsOn && dueDate < rule.startsOn) {
    return "A regra de mensalidade ainda nao cobre esta competencia.";
  }
  if (rule.endsOn && dueDate > rule.endsOn) {
    return "A regra de mensalidade nao cobre mais esta competencia.";
  }
  return null;
}

function assertBillingRuleCoversDueDate(rule: BillingRuleWithClassroom, dueDate: Date) {
  const warning = getBillingRuleRangeWarning(rule, dueDate);
  if (warning) throw new FinancialError("regra", warning);
}

function selectDistinctActiveEnrollments(enrollments: BillingEnrollment[]) {
  const byStudent = new Map<string, BillingEnrollment>();
  for (const enrollment of enrollments) {
    const current = byStudent.get(enrollment.studentId);
    if (!current || enrollment.enrolledAt > current.enrolledAt) {
      byStudent.set(enrollment.studentId, enrollment);
    }
  }

  return Array.from(byStudent.values()).sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, "pt-BR"));
}

async function getEligibleBillingEnrollments(tx: BillingClient, schoolId: string, rule: BillingRuleWithClassroom) {
  const activeAcademicYear = await getActiveAcademicYearForBilling(tx, schoolId);
  if (!activeAcademicYear) return [];

  const enrollments = await tx.enrollment.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      academicYearId: activeAcademicYear.id,
      ...(rule.classroomId ? { classroomId: rule.classroomId } : {})
    },
    include: {
      academicYear: true,
      classroom: true,
      student: {
        include: {
          guardians: {
            where: { guardian: { schoolId } },
            include: { guardian: true },
            orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }]
          }
        }
      }
    },
    orderBy: [{ studentId: "asc" }, { enrolledAt: "desc" }]
  });

  return selectDistinctActiveEnrollments(enrollments);
}

async function buildBillingPreview(
  tx: BillingClient,
  schoolId: string,
  rule: BillingRuleWithClassroom,
  rawCompetence: string
): Promise<BillingPreview> {
  const competence = ensureBillingCompetence(rawCompetence);
  const dueDate = dueDateFromBillingCompetence(competence, rule.dueDay);
  if (!dueDate) throw new FinancialError("data", "Nao foi possivel calcular o vencimento da competencia.");
  const rangeWarning = getBillingRuleRangeWarning(rule, dueDate);

  const enrollments = rangeWarning ? [] : await getEligibleBillingEnrollments(tx, schoolId, rule);
  const studentIds = enrollments.map((enrollment) => enrollment.studentId);
  const existingCharges = studentIds.length
    ? await tx.charge.findMany({
        where: {
          schoolId,
          billingRuleId: rule.id,
          competence,
          studentId: { in: studentIds }
        },
        select: { id: true, studentId: true, status: true }
      })
    : [];
  const existingByStudent = new Map(existingCharges.map((charge) => [charge.studentId, charge]));

  const rows = enrollments.map((enrollment) => {
    const guardian = enrollment.student.guardians[0]?.guardian ?? null;
    const existingCharge = existingByStudent.get(enrollment.studentId) ?? null;
    const hasPaymentGuardian = Boolean(guardian && validCpfCnpj(guardian.cpf));
    const canGenerate = !existingCharge;
    return {
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      studentName: enrollment.student.fullName,
      classroomName: enrollment.classroom.name,
      academicYear: enrollment.academicYear.year,
      guardianId: guardian?.id ?? null,
      guardianName: guardian?.fullName ?? null,
      hasPaymentGuardian,
      existingChargeId: existingCharge?.id ?? null,
      existingStatus: existingCharge?.status ?? null,
      canGenerate,
      situation: existingCharge ? ("EXISTS" as const) : hasPaymentGuardian ? ("READY" as const) : ("NO_PAYMENT_GUARDIAN" as const)
    };
  });

  const eligibleStudents = rows.filter((row) => row.canGenerate).length;
  const missingPaymentGuardian = rows.filter((row) => row.canGenerate && !row.hasPaymentGuardian).length;
  const amount = Number(rule.amount);

  return {
    competence,
    competenceLabel: billingCompetenceLabel(competence),
    dueDate,
    amount: rule.amount.toString(),
    canGenerate: !rangeWarning,
    rangeWarning,
    summary: {
      totalStudents: rows.length,
      eligibleStudents,
      skippedStudents: existingCharges.length,
      existingCharges: existingCharges.length,
      missingPaymentGuardian,
      predictedAmount: eligibleStudents * amount
    },
    rows
  };
}

function summarizeBatchCharges(
  charges: Array<{
    amount: Prisma.Decimal;
    dueDate: Date;
    status: ChargeStatus;
    externalPaymentId: string | null;
    externalStatus: string | null;
  }>
) {
  return charges.reduce(
    (summary, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      const amount = Number(charge.amount);
      if (displayStatus === "PENDING") summary.pending += 1;
      if (displayStatus === "OVERDUE") summary.overdue += 1;
      if (displayStatus === "PAID") {
        summary.paid += 1;
        summary.receivedAmount += amount;
      }
      if (displayStatus === "CANCELED") summary.canceled += 1;
      if (displayStatus === "REFUNDED") summary.refunded += 1;
      if (charge.externalPaymentId) summary.issued += 1;
      if (charge.externalStatus === "ERROR") summary.errors += 1;
      summary.total += 1;
      summary.predictedAmount += amount;
      return summary;
    },
    {
      total: 0,
      pending: 0,
      overdue: 0,
      paid: 0,
      canceled: 0,
      refunded: 0,
      issued: 0,
      errors: 0,
      predictedAmount: 0,
      receivedAmount: 0
    }
  );
}

export async function getRecurringBillingAdmin(
  schoolId: string,
  filters: { billingRuleId?: string; competence?: string } = {}
) {
  await assertFinancialFeature(schoolId);

  const competence = ensureBillingCompetence(filters.competence);
  const [rules, activeAcademicYear] = await Promise.all([
    prisma.billingRule.findMany({
      where: { schoolId },
      include: { classroom: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    }),
    getActiveAcademicYearForBilling(prisma, schoolId)
  ]);
  const selectedRule =
    rules.find((rule) => rule.id === filters.billingRuleId) ?? rules.find((rule) => rule.isActive) ?? rules[0] ?? null;

  const [classrooms, preview, batches] = await Promise.all([
    prisma.classroom.findMany({
      where: { schoolId, ...(activeAcademicYear ? { academicYearId: activeAcademicYear.id } : {}) },
      include: { academicYear: true },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    }),
    selectedRule ? buildBillingPreview(prisma, schoolId, selectedRule, competence) : Promise.resolve(null),
    prisma.billingBatch.findMany({
      where: { schoolId },
      include: {
        billingRule: { include: { classroom: true } },
        generatedBy: { select: { name: true } },
        charges: {
          select: { amount: true, dueDate: true, status: true, externalPaymentId: true, externalStatus: true }
        }
      },
      orderBy: [{ competence: "desc" }, { createdAt: "desc" }],
      take: 24
    })
  ]);

  return {
    rules,
    classrooms,
    selectedRule,
    selectedCompetence: competence,
    preview,
    batches: batches.map((batch) => ({
      ...batch,
      summary: summarizeBatchCharges(batch.charges)
    }))
  };
}

export async function saveBillingRule(schoolId: string, userId: string, input: BillingRuleFormInput) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const parsed = parseBillingRuleInput(input);

    if (parsed.classroomId) {
      const classroom = await tx.classroom.findFirst({
        where: { id: parsed.classroomId, schoolId },
        select: { id: true }
      });
      if (!classroom) throw new FinancialError("regra", "Turma nao encontrada nesta escola.");
    }

    const rule = input.ruleId
      ? await (async () => {
          const existingRule = await tx.billingRule.findFirst({
            where: { id: input.ruleId, schoolId },
            select: { id: true }
          });
          if (!existingRule) throw new FinancialError("regra", "Regra de mensalidade nao encontrada.");
          return tx.billingRule.update({
            where: { id: existingRule.id },
            data: parsed
          });
        })()
      : await tx.billingRule.create({
          data: {
            schoolId,
            ...parsed
          }
        });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: input.ruleId ? "billing_rule.updated" : "billing_rule.created",
        entity: "BillingRule",
        entityId: rule.id
      }
    });

    return rule.id;
  });
}

export async function generateBillingBatch(schoolId: string, userId: string, input: { billingRuleId: string; competence: string }) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const rule = await resolveBillingRule(tx, schoolId, input.billingRuleId);
    if (!rule.isActive) throw new FinancialError("regra", "A regra de mensalidade esta inativa.");

    const preview = await buildBillingPreview(tx, schoolId, rule, input.competence);
    assertBillingRuleCoversDueDate(rule, preview.dueDate);
    const batch = await tx.billingBatch.upsert({
      where: {
        schoolId_billingRuleId_competence: {
          schoolId,
          billingRuleId: rule.id,
          competence: preview.competence
        }
      },
      create: {
        schoolId,
        billingRuleId: rule.id,
        competence: preview.competence,
        dueDate: preview.dueDate,
        totalStudents: preview.summary.totalStudents,
        eligibleStudents: preview.summary.eligibleStudents,
        skippedStudents: preview.summary.skippedStudents,
        existingCharges: preview.summary.existingCharges,
        amountTotal: preview.summary.predictedAmount.toFixed(2),
        generatedById: userId
      },
      update: {
        dueDate: preview.dueDate,
        totalStudents: preview.summary.totalStudents,
        eligibleStudents: preview.summary.eligibleStudents,
        skippedStudents: preview.summary.skippedStudents,
        existingCharges: preview.summary.existingCharges,
        amountTotal: preview.summary.predictedAmount.toFixed(2),
        generatedById: userId
      }
    });

    let created = 0;
    for (const row of preview.rows.filter((item) => item.canGenerate)) {
      try {
        const charge = await tx.charge.create({
          data: {
            schoolId,
            studentId: row.studentId,
            enrollmentId: row.enrollmentId,
            guardianId: row.guardianId,
            billingRuleId: rule.id,
            billingBatchId: batch.id,
            competence: preview.competence,
            reference: `${rule.name} ${preview.competenceLabel}`,
            description: rule.notes ?? `Mensalidade referente a ${preview.competenceLabel}.`,
            amount: rule.amount,
            dueDate: preview.dueDate
          }
        });

        await recordFinancialEvent(tx, {
          schoolId,
          userId,
          chargeId: charge.id,
          source: "ADMIN",
          action: "financial_charge.recurring_created",
          nextStatus: "PENDING",
          message: `Mensalidade ${preview.competenceLabel} gerada em lote.`
        });
        created += 1;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }

    const generatedCharges = await tx.charge.findMany({
      where: {
        schoolId,
        billingRuleId: rule.id,
        competence: preview.competence
      },
      select: { amount: true }
    });
    const amountTotal = generatedCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);

    await tx.billingBatch.update({
      where: { id: batch.id },
      data: {
        generatedCharges: generatedCharges.length,
        amountTotal: amountTotal.toFixed(2)
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "billing_batch.generated",
        entity: "BillingBatch",
        entityId: batch.id
      }
    });

    return {
      batchId: batch.id,
      competence: preview.competence,
      created,
      existing: preview.summary.existingCharges,
      total: generatedCharges.length
    };
  });
}

export async function emitBillingBatchPayments(
  schoolId: string,
  userId: string,
  input: { billingRuleId: string; competence: string; billingType: ExternalBillingType }
) {
  await assertFinancialFeature(schoolId);
  const rule = await resolveBillingRule(prisma, schoolId, input.billingRuleId);
  const competence = ensureBillingCompetence(input.competence);

  const charges = await prisma.charge.findMany({
    where: {
      schoolId,
      billingRuleId: rule.id,
      competence,
      status: "PENDING"
    },
    include: { guardian: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
  });

  let emitted = 0;
  let failed = 0;
  let skipped = 0;

  for (const charge of charges) {
    if (charge.externalPaymentId) {
      skipped += 1;
      continue;
    }

    if (!charge.guardian || !validCpfCnpj(charge.guardian.cpf)) {
      const message = "Responsavel sem CPF/CNPJ valido para gerar cobranca externa.";
      await prisma.$transaction(async (tx) => {
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            provider: "ASAAS",
            billingType: input.billingType,
            externalStatus: "ERROR",
            syncError: message
          }
        });
        await recordFinancialEvent(tx, {
          schoolId,
          userId,
          chargeId: charge.id,
          source: "ADMIN",
          action: "financial_charge.external_payment_failed",
          previousStatus: charge.status,
          nextStatus: charge.status,
          previousExternalStatus: charge.externalStatus,
          nextExternalStatus: "ERROR",
          message
        });
      });
      failed += 1;
      continue;
    }

    try {
      await generateExternalPayment(schoolId, userId, charge.id, input.billingType);
      emitted += 1;
    } catch {
      failed += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId,
      action: input.billingType === "PIX" ? "billing_batch.pix_issued" : "billing_batch.boleto_issued",
      entity: "BillingRule",
      entityId: rule.id
    }
  });

  return { emitted, failed, skipped, total: charges.length };
}

export async function getGuardianFinancialPortal(schoolId: string, userId: string, selectedStudentId?: string) {
  await assertFinancialFeature(schoolId);

  const guardian = await prisma.guardian.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      students: {
        include: {
          student: {
            include: {
              enrollments: {
                include: { classroom: true, academicYear: true },
                orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
                take: 1
              }
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }]
      }
    }
  });

  const children = guardian.students.map((item) => item.student);
  const selectedStudent = children.find((student) => student.id === selectedStudentId) ?? children[0] ?? null;

  const charges = selectedStudent
      ? await prisma.charge.findMany({
          where: { schoolId, studentId: selectedStudent.id },
          include: {
            student: true,
            enrollment: { include: { classroom: true, academicYear: true } },
            financialEvents: {
              orderBy: { createdAt: "desc" },
              take: 4
            }
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        })
    : [];

  const pixInstructions = Object.fromEntries(
    await Promise.all(
      charges
        .filter((charge) => charge.provider === "ASAAS" && charge.billingType === "PIX" && charge.externalPaymentId)
        .map(async (charge) => {
          try {
            const pix = await getAsaasPixQrCode(charge.externalPaymentId as string);
            return [charge.id, { pix }] as const;
          } catch (error) {
            return [charge.id, { error: summarizeIntegrationError(error) }] as const;
          }
        })
    )
  ) as Record<string, { pix?: AsaasPixQrCode; error?: string }>;

  return { guardian, children, selectedStudent, charges, pixInstructions };
}

function webhookEventId(payload: AsaasWebhookPayload) {
  const paymentId = payload.payment?.id ?? "sem-pagamento";
  const status = payload.payment?.status ?? "sem-status";
  return payload.id ?? payload.eventId ?? `${payload.event ?? "UNKNOWN"}:${paymentId}:${status}`;
}

function parseAsaasPaymentDate(payload: AsaasWebhookPayload) {
  const value = payload.payment?.paymentDate ?? payload.payment?.clientPaymentDate ?? payload.payment?.confirmedDate;
  if (!value) return new Date();

  const parsed = dateFromCivilInput(value);
  const fallback = new Date(value);
  if (parsed) return parsed;
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function processAsaasWebhook(payload: AsaasWebhookPayload) {
  const eventType = payload.event ?? "UNKNOWN";
  const externalPaymentId = payload.payment?.id ?? null;
  const externalEventId = webhookEventId(payload);

  try {
    await prisma.asaasWebhookEvent.create({
      data: {
        externalEventId,
        eventType,
        externalPaymentId
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { status: "duplicate" as const };
    throw error;
  }

  try {
    if (!externalPaymentId) {
      throw new Error("Webhook sem identificador de pagamento.");
    }

    const charge = await prisma.charge.findUnique({
      where: { externalPaymentId },
      select: {
        id: true,
        schoolId: true,
        status: true,
        externalStatus: true,
        paidAt: true,
        canceledAt: true,
        refundedAt: true
      }
    });

    if (!charge) {
      throw new Error("Pagamento externo nao encontrado em cobrancas Azura.");
    }

    const externalStatus = payload.payment?.status ?? eventType;
    const normalizedStatus = normalizeAsaasPaymentStatus(externalStatus);
    const nextStatus = nextChargeStatusFromAsaas(charge.status, externalStatus);

    if (normalizedStatus === "REFUND_DENIED") {
      await prisma.$transaction(async (tx) => {
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            externalStatus,
            lastSyncedAt: new Date(),
            syncError: "Reembolso negado pelo Asaas."
          }
        });

        await recordFinancialEvent(tx, {
          schoolId: charge.schoolId,
          chargeId: charge.id,
          source: "WEBHOOK",
          action: "financial_charge.webhook_refund_denied",
          previousStatus: charge.status,
          nextStatus: charge.status,
          previousExternalStatus: charge.externalStatus,
          nextExternalStatus: externalStatus,
          message: "Reembolso negado pelo Asaas.",
          externalEventId
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            status: nextStatus ?? undefined,
            paidAt: nextStatus === "PAID" && !charge.paidAt ? parseAsaasPaymentDate(payload) : undefined,
            canceledAt: nextStatus === "CANCELED" && !charge.canceledAt ? new Date() : undefined,
            refundedAt: nextStatus === "REFUNDED" && !charge.refundedAt ? new Date() : undefined,
            refundRequestedAt:
              normalizedStatus === "REFUND_IN_PROGRESS" || normalizedStatus === "REFUND_REQUESTED"
                ? new Date()
                : undefined,
            externalStatus,
            lastSyncedAt: new Date(),
            syncError: null
          }
        });

        await recordFinancialEvent(tx, {
          schoolId: charge.schoolId,
          chargeId: charge.id,
          source: "WEBHOOK",
          action: `financial_charge.webhook_${normalizedStatus.toLowerCase()}`,
          previousStatus: charge.status,
          nextStatus: nextStatus ?? charge.status,
          previousExternalStatus: charge.externalStatus,
          nextExternalStatus: externalStatus,
          message: "Evento recebido pelo webhook Asaas.",
          externalEventId
        });

        if (nextStatus && nextStatus !== charge.status) {
          await tx.auditLog.create({
            data: {
              schoolId: charge.schoolId,
              userId: null,
              action: `financial_charge.webhook_${nextStatus.toLowerCase()}`,
              entity: "Charge",
              entityId: charge.id
            }
          });
        }
      });
    }

    await prisma.asaasWebhookEvent.update({
      where: { externalEventId },
      data: { processedAt: new Date(), processingError: null }
    });

    return { status: "processed" as const };
  } catch (error) {
    await prisma.asaasWebhookEvent.update({
      where: { externalEventId },
      data: {
        processedAt: new Date(),
        processingError: summarizeIntegrationError(error)
      }
    });

    return { status: "stored_with_error" as const };
  }
}
