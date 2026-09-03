import type { ChargeStatus } from "@prisma/client";

export type ChargeDisplayStatus = ChargeStatus | "OVERDUE";

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
    CANCELED: "Cancelado"
  };
  return labels[status];
}

export function chargeStatusTone(status: ChargeDisplayStatus) {
  const tones: Record<ChargeDisplayStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
    PENDING: "warning",
    PAID: "success",
    OVERDUE: "danger",
    CANCELED: "neutral"
  };
  return tones[status];
}
