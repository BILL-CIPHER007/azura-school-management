import type { DocumentType, Prisma, UserRole } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export const documentTypes = {
  boletim: { type: "BOLETIM", label: "Boletim" },
  historico: { type: "HISTORICO_ESCOLAR", label: "Histórico escolar" },
  "declaracao-matricula": { type: "DECLARACAO_MATRICULA", label: "Declaração de matrícula" }
} as const satisfies Record<string, { type: DocumentType; label: string }>;

export function isDocumentType(value: string): value is keyof typeof documentTypes {
  return Object.prototype.hasOwnProperty.call(documentTypes, value);
}

type Settings = { enabled: boolean; studentCanDownload: boolean; guardianCanDownload: boolean };
const defaults: Settings = { enabled: true, studentCanDownload: true, guardianCanDownload: true };
const fields = { enabled: true, studentCanDownload: true, guardianCanDownload: true } as const;

export async function getDocumentPolicies(schoolId: string, client: Prisma.TransactionClient = prisma) {
  const rows = await client.documentPolicy.findMany({ where: { schoolId }, select: { documentType: true, ...fields } });
  return Object.fromEntries(Object.values(documentTypes).map(({ type }) =>
    [type, rows.find(row => row.documentType === type) ?? defaults]
  )) as Record<DocumentType, Settings>;
}

export function canDownload(role: UserRole, policy: Settings) {
  return role === "ADMIN" || (policy.enabled && (
    (role === "ALUNO" && policy.studentCanDownload) || (role === "RESPONSAVEL" && policy.guardianCanDownload)
  ));
}

export async function saveDocumentPolicy(tx: Prisma.TransactionClient, actor: SessionUser, documentType: DocumentType, input: Settings) {
  if (actor.role !== "ADMIN") throw new Error("Acesso restrito à administração.");
  const schoolId = actor.schoolId;
  // Serialize the audit snapshot and update, including the first write for a document.
  await tx.$queryRaw`SELECT id FROM "School" WHERE id = ${schoolId} FOR UPDATE`;
  const where = { schoolId_documentType: { schoolId, documentType } };
  const before = await tx.documentPolicy.findUnique({ where, select: fields }) ?? defaults;
  if (before.enabled === input.enabled && before.studentCanDownload === input.studentCanDownload &&
      before.guardianCanDownload === input.guardianCanDownload) return;
  const policy = await tx.documentPolicy.upsert({ where, create: { schoolId, documentType, ...input }, update: input });
  await recordAuditLog(tx, {
    schoolId, actor, source: "ADMIN", action: "document.policy.updated", entity: "DocumentPolicy",
    entityId: policy.id, before, after: input, metadata: { documentType }
  });
}
