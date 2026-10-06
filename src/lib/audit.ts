import { Prisma, type AuditSource, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

if (typeof window !== "undefined") {
  throw new Error("src/lib/audit.ts is server-only.");
}

type AuditClient = typeof prisma | Prisma.TransactionClient;
type JsonObject = Record<string, unknown>;
type SanitizedJson = Prisma.InputJsonValue | null | undefined;

const FORBIDDEN_KEY_PATTERN = /password|passwordHash|token|apiKey|authorization|cookie|secret|accessToken|refreshToken/i;
const SENSITIVE_KEY_PATTERN = /cpf|cnpj|email|phone|telefone|address|endereco/i;

export type AuditActor = {
  id?: string | null;
  role?: UserRole | string | null;
};

export type AuditLogInput = {
  schoolId: string;
  actor?: AuditActor | null;
  action: string;
  entity: string;
  entityId: string;
  source?: AuditSource;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

export type AuditDiff = {
  before?: JsonObject;
  after?: JsonObject;
  changedFields: string[];
};

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function maskCpf(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return digits ? "***" : null;
  return `***.***.***-${digits.slice(-2)}`;
}

function maskEmail(value: unknown) {
  const email = String(value ?? "").trim();
  if (!email || !email.includes("@")) return email ? "***" : null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return digits ? "***" : null;
  return `***${digits.slice(-4)}`;
}

function sanitizeSensitiveValue(key: string, value: unknown) {
  const normalized = key.toLowerCase();
  if (normalized.includes("cpf") || normalized.includes("cnpj")) return maskCpf(value);
  if (normalized.includes("email")) return maskEmail(value);
  if (normalized.includes("phone") || normalized.includes("telefone")) return maskPhone(value);
  if (normalized.includes("address") || normalized.includes("endereco")) return value ? "[alterado]" : null;
  return value;
}

export function sanitizeAuditValue(value: unknown, key = ""): SanitizedJson {
  if (FORBIDDEN_KEY_PATTERN.test(key)) return undefined;
  if (value === undefined) return undefined;
  if (value === null) return null;

  const safeValue = SENSITIVE_KEY_PATTERN.test(key) ? sanitizeSensitiveValue(key, value) : value;

  if (safeValue instanceof Date) return safeValue.toISOString();

  if (typeof safeValue === "string" || typeof safeValue === "number" || typeof safeValue === "boolean") {
    return safeValue;
  }

  if (Array.isArray(safeValue)) {
    return safeValue
      .map((item) => sanitizeAuditValue(item, key))
      .filter((item): item is Prisma.InputJsonValue | null => item !== undefined);
  }

  if (isPlainObject(safeValue)) {
    const result: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [itemKey, itemValue] of Object.entries(safeValue)) {
      if (FORBIDDEN_KEY_PATTERN.test(itemKey)) continue;
      const sanitized = sanitizeAuditValue(itemValue, itemKey);
      if (sanitized !== undefined) result[itemKey] = sanitized;
    }
    return result;
  }

  return String(safeValue);
}

function prismaJsonValue(value: SanitizedJson) {
  if (value === null) return Prisma.JsonNull;
  return value;
}

function jsonEquals(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function buildAuditDiff(before: JsonObject | null | undefined, after: JsonObject, fields: string[]): AuditDiff {
  const beforeDiff: JsonObject = {};
  const afterDiff: JsonObject = {};
  const changedFields: string[] = [];

  for (const field of fields) {
    const beforeValue = before?.[field] ?? null;
    const afterValue = after[field] ?? null;
    if (jsonEquals(beforeValue, afterValue)) continue;
    changedFields.push(field);
    beforeDiff[field] = beforeValue;
    afterDiff[field] = afterValue;
  }

  return {
    before: changedFields.length ? beforeDiff : undefined,
    after: changedFields.length ? afterDiff : undefined,
    changedFields
  };
}

export function auditSourceFromRole(role?: UserRole | string | null): AuditSource {
  if (role === "ADMIN") return "ADMIN";
  if (role === "PROFESSOR") return "PROFESSOR";
  if (role === "ALUNO") return "ALUNO";
  if (role === "RESPONSAVEL") return "RESPONSAVEL";
  return "SYSTEM";
}

export async function recordAuditLog(client: AuditClient, input: AuditLogInput) {
  const before = sanitizeAuditValue(input.before);
  const after = sanitizeAuditValue(input.after);
  const metadata = sanitizeAuditValue(input.metadata);
  const actorRole = input.actor?.role ? (input.actor.role as UserRole) : undefined;

  return client.auditLog.create({
    data: {
      schoolId: input.schoolId,
      userId: input.actor?.id ?? null,
      actorRole,
      source: input.source ?? auditSourceFromRole(actorRole),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: prismaJsonValue(before),
      after: prismaJsonValue(after),
      metadata: prismaJsonValue(metadata)
    }
  });
}
