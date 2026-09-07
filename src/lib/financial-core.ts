import type { ChargeStatus, ExternalBillingType, PaymentProvider } from "@prisma/client";

export type ChargeDisplayStatus = ChargeStatus | "OVERDUE";
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

export function getChargeDisplayStatus(status: ChargeStatus, dueDate: Date, now = new Date()): ChargeDisplayStatus {
  if (status !== "PENDING") return status;
  return toCivilDateKey(dueDate) < toCivilDateKey(now) ? "OVERDUE" : "PENDING";
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
