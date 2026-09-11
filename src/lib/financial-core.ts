import type { ChargeStatus, ExternalBillingType, PaymentPromiseStatus, PaymentProvider } from "@prisma/client";

export type ChargeDisplayStatus = ChargeStatus | "OVERDUE";
export type DelinquencyBucket = "EM_DIA" | "ATRASO_LEVE" | "ATRASO_MODERADO" | "ATRASO_CRITICO";
export type CollectionRecommendation = "ACOMPANHAR" | "LEMBRAR" | "REFORCAR_CONTATO" | "ATENCAO_PRIORITARIA";
export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS"
  | "PARTIALLY_REFUNDED"
  | "REFUND_DENIED"
  | "DELETED"
  | "CANCELLED"
  | "ERROR"
  | "UNKNOWN";

const asaasStatusAliases: Record<string, AsaasPaymentStatus> = {
  PAYMENT_RECEIVED: "RECEIVED",
  PAYMENT_CONFIRMED: "CONFIRMED",
  PAYMENT_OVERDUE: "OVERDUE",
  PAYMENT_REFUNDED: "REFUNDED",
  PAYMENT_REFUND_IN_PROGRESS: "REFUND_IN_PROGRESS",
  PAYMENT_PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  PAYMENT_REFUND_DENIED: "REFUND_DENIED",
  PAYMENT_DELETED: "DELETED",
  PAYMENT_BANK_SLIP_CANCELLED: "CANCELLED",
  RECEIVED: "RECEIVED",
  CONFIRMED: "CONFIRMED",
  PENDING: "PENDING",
  OVERDUE: "OVERDUE",
  REFUNDED: "REFUNDED",
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_IN_PROGRESS: "REFUND_IN_PROGRESS",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUND_DENIED: "REFUND_DENIED",
  DELETED: "DELETED",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
  ERROR: "ERROR"
};

export const DELINQUENCY_BUCKETS: Record<
  DelinquencyBucket,
  { label: string; shortLabel: string; minDays: number; maxDays: number | null }
> = {
  EM_DIA: { label: "Em dia", shortLabel: "Em dia", minDays: 0, maxDays: 0 },
  ATRASO_LEVE: { label: "Atraso leve", shortLabel: "1 a 5 dias", minDays: 1, maxDays: 5 },
  ATRASO_MODERADO: { label: "Atraso moderado", shortLabel: "6 a 15 dias", minDays: 6, maxDays: 15 },
  ATRASO_CRITICO: { label: "Atraso critico", shortLabel: "16+ dias", minDays: 16, maxDays: null }
};

export const COLLECTION_RECOMMENDATIONS: Record<CollectionRecommendation, string> = {
  ACOMPANHAR: "Acompanhar",
  LEMBRAR: "Lembrar responsavel",
  REFORCAR_CONTATO: "Reforcar contato",
  ATENCAO_PRIORITARIA: "Atencao prioritaria"
};

export function parseCurrencyInput(value: string) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return null;

  const withoutCurrency = normalized.replace(/^R\$/i, "");
  const decimalSeparator = withoutCurrency.includes(",") ? "," : ".";
  const clean =
    decimalSeparator === ","
      ? withoutCurrency.replace(/\./g, "").replace(",", ".")
      : withoutCurrency.replace(/,/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;

  const amount = Number(clean);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return amount.toFixed(2);
}

export function formatCurrencyBRL(value: number | string | { toString(): string }) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amount);
}

export function dateFromCivilInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T12:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function toCivilDateKey(value: Date, timeZone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

export function todayCivilDate(timeZone = "America/Sao_Paulo") {
  const todayKey = toCivilDateKey(new Date(), timeZone);
  return dateFromCivilInput(todayKey) ?? new Date();
}

export function normalizeBillingCompetence(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;

  const [year, month] = trimmed.split("-").map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;

  return `${year}-${String(month).padStart(2, "0")}`;
}

export function billingCompetenceLabel(value: string) {
  const competence = normalizeBillingCompetence(value);
  if (!competence) return value;

  const [year, month] = competence.split("-");
  return `${month}/${year}`;
}

export function dueDateFromBillingCompetence(competence: string, dueDay: number) {
  const normalized = normalizeBillingCompetence(competence);
  if (!normalized || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return null;

  const [year, month] = normalized.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const day = Math.min(dueDay, lastDay);

  return dateFromCivilInput(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

export function getChargeDisplayStatus(status: ChargeStatus, dueDate: Date, now = new Date()): ChargeDisplayStatus {
  if (status !== "PENDING") return status;
  return toCivilDateKey(dueDate) < toCivilDateKey(now) ? "OVERDUE" : "PENDING";
}

export function isChargeOpenForCollection(status: ChargeStatus) {
  return status === "PENDING";
}

export function getDaysOverdue(dueDate: Date, now = new Date()) {
  const due = dateFromCivilInput(toCivilDateKey(dueDate));
  const today = dateFromCivilInput(toCivilDateKey(now));
  if (!due || !today) return 0;
  const diff = Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export function isChargeDelinquent(status: ChargeStatus, dueDate: Date, now = new Date()) {
  return isChargeOpenForCollection(status) && getDaysOverdue(dueDate, now) > 0;
}

export function getDelinquencyBucket(daysOverdue: number): DelinquencyBucket {
  if (daysOverdue <= 0) return "EM_DIA";
  if (daysOverdue <= 5) return "ATRASO_LEVE";
  if (daysOverdue <= 15) return "ATRASO_MODERADO";
  return "ATRASO_CRITICO";
}

export function delinquencyBucketLabel(bucket: DelinquencyBucket) {
  return DELINQUENCY_BUCKETS[bucket].label;
}

export function delinquencyBucketTone(bucket: DelinquencyBucket): "neutral" | "success" | "warning" | "danger" | "info" {
  const tones: Record<DelinquencyBucket, "neutral" | "success" | "warning" | "danger" | "info"> = {
    EM_DIA: "success",
    ATRASO_LEVE: "warning",
    ATRASO_MODERADO: "warning",
    ATRASO_CRITICO: "danger"
  };
  return tones[bucket];
}

export function getCollectionRecommendation(daysOverdue: number): CollectionRecommendation {
  const bucket = getDelinquencyBucket(daysOverdue);
  if (bucket === "ATRASO_LEVE") return "LEMBRAR";
  if (bucket === "ATRASO_MODERADO") return "REFORCAR_CONTATO";
  if (bucket === "ATRASO_CRITICO") return "ATENCAO_PRIORITARIA";
  return "ACOMPANHAR";
}

export function isPaymentPromiseOverdue(
  promisedDate?: Date | null,
  status?: PaymentPromiseStatus | null,
  now = new Date()
) {
  if (!promisedDate || status !== "OPEN") return false;
  return toCivilDateKey(promisedDate) < toCivilDateKey(now);
}

export function chargeStatusLabel(status: ChargeDisplayStatus) {
  const labels: Record<ChargeDisplayStatus, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado"
  };
  return labels[status];
}

export function chargeStatusTone(status: ChargeDisplayStatus) {
  const tones: Record<ChargeDisplayStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
    PENDING: "warning",
    PAID: "success",
    OVERDUE: "danger",
    CANCELED: "neutral",
    REFUNDED: "neutral"
  };
  return tones[status];
}

export function normalizeAsaasPaymentStatus(value?: string | null): AsaasPaymentStatus {
  if (!value) return "UNKNOWN";
  return asaasStatusAliases[value.trim().toUpperCase()] ?? "UNKNOWN";
}

export function asaasPaymentStatusLabel(value?: string | null) {
  const labels: Record<AsaasPaymentStatus, string> = {
    PENDING: "Pendente no Asaas",
    RECEIVED: "Recebido no Asaas",
    CONFIRMED: "Confirmado no Asaas",
    OVERDUE: "Vencido no Asaas",
    REFUNDED: "Reembolsado no Asaas",
    REFUND_REQUESTED: "Reembolso solicitado",
    REFUND_IN_PROGRESS: "Reembolso em processamento",
    PARTIALLY_REFUNDED: "Reembolso parcial",
    REFUND_DENIED: "Reembolso negado",
    DELETED: "Removido no Asaas",
    CANCELLED: "Cancelado no Asaas",
    ERROR: "Falha de sincronização",
    UNKNOWN: "Status externo não informado"
  };

  return labels[normalizeAsaasPaymentStatus(value)];
}

export function asaasPaymentStatusTone(value?: string | null): "neutral" | "success" | "warning" | "danger" | "info" {
  const tones: Record<AsaasPaymentStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
    PENDING: "warning",
    RECEIVED: "success",
    CONFIRMED: "success",
    OVERDUE: "danger",
    REFUNDED: "neutral",
    REFUND_REQUESTED: "info",
    REFUND_IN_PROGRESS: "info",
    PARTIALLY_REFUNDED: "warning",
    REFUND_DENIED: "danger",
    DELETED: "neutral",
    CANCELLED: "neutral",
    ERROR: "danger",
    UNKNOWN: "neutral"
  };

  return tones[normalizeAsaasPaymentStatus(value)];
}

export function canCancelAsaasPaymentStatus(value?: string | null) {
  const status = normalizeAsaasPaymentStatus(value);
  return status === "PENDING" || status === "OVERDUE";
}

export function canRefundAsaasPaymentStatus(value?: string | null) {
  const status = normalizeAsaasPaymentStatus(value);
  return status === "RECEIVED" || status === "CONFIRMED";
}

export function canRequestRefund(status: ChargeStatus, billingType?: ExternalBillingType | null, externalStatus?: string | null) {
  return status === "PAID" && billingType === "PIX" && canRefundAsaasPaymentStatus(externalStatus);
}

export function nextChargeStatusFromAsaas(
  currentStatus: ChargeStatus,
  externalStatus?: string | null
): ChargeStatus | null {
  const status = normalizeAsaasPaymentStatus(externalStatus);

  if (status === "RECEIVED" || status === "CONFIRMED") {
    return currentStatus === "PENDING" ? "PAID" : null;
  }

  if (status === "REFUNDED") {
    return currentStatus === "PAID" || currentStatus === "PENDING" ? "REFUNDED" : null;
  }

  if (status === "DELETED" || status === "CANCELLED") {
    return currentStatus === "PENDING" ? "CANCELED" : null;
  }

  return null;
}

export function billingTypeLabel(value: ExternalBillingType | null | undefined) {
  const labels: Record<ExternalBillingType, string> = {
    PIX: "Pix",
    BOLETO: "Boleto"
  };
  return value ? labels[value] : "Sem gateway";
}

export function paymentProviderLabel(value: PaymentProvider | null | undefined) {
  const labels: Record<PaymentProvider, string> = {
    ASAAS: "Asaas Sandbox"
  };
  return value ? labels[value] : "Interno";
}

export const BILLING_AUTOMATION_TIME_ZONE = "America/Sao_Paulo";

export type BillingAutomationRuleWindow = {
  isActive: boolean;
  autoGenerate: boolean;
  generationDay: number;
  dueDay: number;
  startsOn?: Date | null;
  endsOn?: Date | null;
};

export function getBillingAutomationDateParts(value = new Date(), timeZone = BILLING_AUTOMATION_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
}

export function getBillingAutomationCompetence(value = new Date()) {
  const parts = getBillingAutomationDateParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

export function daysInBillingMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

export function clampBillingAutomationDay(year: number, month: number, generationDay: number) {
  if (!Number.isInteger(generationDay) || generationDay < 1 || generationDay > 31) return null;
  return Math.min(generationDay, daysInBillingMonth(year, month));
}

export function billingAutomationDateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function billingAutomationRunAtFromCompetence(competence: string, generationDay: number) {
  const normalized = normalizeBillingCompetence(competence);
  if (!normalized) return null;

  const [year, month] = normalized.split("-").map(Number);
  const day = clampBillingAutomationDay(year, month, generationDay);
  if (!day) return null;

  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0, 0));
}

export function isBillingCompetenceWithinRuleValidity(rule: Pick<BillingAutomationRuleWindow, "dueDay" | "startsOn" | "endsOn">, competence: string) {
  const dueDate = dueDateFromBillingCompetence(competence, rule.dueDay);
  if (!dueDate) return false;

  if (rule.startsOn && dueDate < rule.startsOn) return false;
  if (rule.endsOn && dueDate > rule.endsOn) return false;

  return true;
}

export function shouldRunBillingAutomationRule(rule: BillingAutomationRuleWindow, value = new Date()) {
  if (!rule.isActive || !rule.autoGenerate) return false;

  const parts = getBillingAutomationDateParts(value);
  const generationDay = clampBillingAutomationDay(parts.year, parts.month, rule.generationDay);
  if (!generationDay || parts.day !== generationDay) return false;

  return isBillingCompetenceWithinRuleValidity(rule, getBillingAutomationCompetence(value));
}

export function getNextBillingAutomationRunAt(rule: BillingAutomationRuleWindow, from = new Date()) {
  if (!rule.isActive || !rule.autoGenerate) return null;

  const current = getBillingAutomationDateParts(from);
  const todayKey = Number(`${current.year}${String(current.month).padStart(2, "0")}${String(current.day).padStart(2, "0")}`);

  for (let offset = 0; offset < 24; offset += 1) {
    const monthIndex = current.month - 1 + offset;
    const candidateYear = current.year + Math.floor(monthIndex / 12);
    const candidateMonth = (monthIndex % 12) + 1;
    const candidateDay = clampBillingAutomationDay(candidateYear, candidateMonth, rule.generationDay);
    if (!candidateDay) return null;

    const candidateKey = Number(
      `${candidateYear}${String(candidateMonth).padStart(2, "0")}${String(candidateDay).padStart(2, "0")}`
    );
    const competence = `${candidateYear}-${String(candidateMonth).padStart(2, "0")}`;

    if (candidateKey >= todayKey && isBillingCompetenceWithinRuleValidity(rule, competence)) {
      return billingAutomationRunAtFromCompetence(competence, rule.generationDay);
    }
  }

  return null;
}
