import type { AuditSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;
const AUDIT_SOURCES = ["ADMIN", "PROFESSOR", "ALUNO", "RESPONSAVEL", "SYSTEM", "CRON", "WEBHOOK", "PROVIDER"] as const;

export type AuditLogFilters = {
  page?: number;
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  entity?: string;
  source?: AuditSource | string;
  entityId?: string;
};

function dateFromInput(value?: string, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
}

function validAuditSource(value?: AuditSource | string): AuditSource | undefined {
  if (!value) return undefined;
  return AUDIT_SOURCES.includes(value as AuditSource) ? (value as AuditSource) : undefined;
}

export async function listInstitutionalAuditLogs(schoolId: string, filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const source = validAuditSource(filters.source);
  const createdAt: Prisma.DateTimeFilter = {};
  const from = dateFromInput(filters.from);
  const to = dateFromInput(filters.to, true);
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;

  const where: Prisma.AuditLogWhereInput = {
    schoolId,
    ...(from || to ? { createdAt } : {}),
    userId: filters.userId || undefined,
    action: filters.action || undefined,
    entity: filters.entity || undefined,
    source,
    entityId: filters.entityId ? { contains: filters.entityId, mode: "insensitive" } : undefined
  };

  const [logs, total, users, actionRows, entityRows, sourceRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: { schoolId },
      select: { id: true, name: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.auditLog.findMany({
      where: { schoolId },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" }
    }),
    prisma.auditLog.findMany({
      where: { schoolId },
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" }
    }),
    prisma.auditLog.findMany({
      where: { schoolId },
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" }
    })
  ]);

  return {
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    users,
    actions: actionRows.map((row) => row.action),
    entities: entityRows.map((row) => row.entity),
    sources: sourceRows.map((row) => row.source)
  };
}
