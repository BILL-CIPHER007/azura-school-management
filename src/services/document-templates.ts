import type { DocumentTemplate, DocumentTemplateType, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import type { SessionUser } from "../lib/session";
import { recordAuditLog } from "../lib/audit";
import { check, isTemplateType, type TemplateData } from "../lib/document-template-placeholders";
import { inspectDocx, limit, mime } from "../lib/document-templates/docx";
import { renderBlocks } from "../lib/document-templates/pdf";
import { digest, newKey, readOriginal, removeFile, storeFile } from "../lib/document-templates/storage";

function admin(actor: SessionUser) {
  check(actor.role === "ADMIN", "Acesso restrito à administração.");
}
async function scoped(tx: Prisma.TransactionClient, actor: SessionUser, type: DocumentTemplateType) {
  admin(actor);
  if (type === "RECIBO") {
    const school = await tx.school.findUnique({ where: { id: actor.schoolId }, select: { plan: true } });
    check(school?.plan === "PROFISSIONAL", "Recibo disponível apenas no plano Profissional.");
  }
}
async function lock(tx: Prisma.TransactionClient, schoolId: string) {
  await tx.$queryRaw`SELECT id FROM "School" WHERE id=${schoolId} FOR UPDATE`;
}
function audit(
  tx: Prisma.TransactionClient,
  actor: SessionUser,
  row: DocumentTemplate,
  event: string,
  before?: unknown,
  after?: unknown
) {
  return recordAuditLog(tx, {
    schoolId: actor.schoolId,
    actor,
    source: "ADMIN",
    action: "template." + event,
    entity: "DocumentTemplate",
    entityId: row.id,
    before,
    after,
    metadata: { documentType: row.type, version: row.version }
  });
}
export async function uploadTemplate(
  actor: SessionUser,
  type: string,
  name: string,
  file: { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }
) {
  admin(actor);
  check(isTemplateType(type), "Tipo de documento inválido.");
  await scoped(prisma, actor, type);
  name = name.trim();
  check(name.length > 0 && name.length <= 100, "Informe um nome de até 100 caracteres.");
  let bytes: Buffer, inspection: Awaited<ReturnType<typeof inspectDocx>>;
  try {
    check(
      file && file.size > 0 && file.size <= limit && file.type === mime && /\.docx$/i.test(file.name),
      "Envie um arquivo DOCX de até 1 MB."
    );
    bytes = Buffer.from(await file.arrayBuffer());
    inspection = await inspectDocx(bytes, type);
  } catch (error) {
    await recordAuditLog(prisma, {
      schoolId: actor.schoolId,
      actor,
      source: "ADMIN",
      action: "template.rejected",
      entity: "DocumentTemplate",
      entityId: randomUUID(),
      after: { valid: false },
      metadata: { documentType: type }
    });
    throw error;
  }
  let key="", version=0, stored=false;
  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx, actor.schoolId);
      await scoped(tx, actor, type);
      const prev = await tx.documentTemplate.aggregate({
        where: { schoolId: actor.schoolId, type },
        _max: { version: true }
      });
      version=(prev._max.version??0)+1;
      key=newKey(actor.schoolId,type,version);
      await storeFile(actor.schoolId,type,key,version,bytes);
      stored=true;
      const row = await tx.documentTemplate.create({
        data: {
          schoolId: actor.schoolId,
          type,
          name,
          version,
          createdById: actor.id,
          originalName:
            file.name
              .replace(/\.docx$/i, "")
              .replace(/[^\p{L}\p{N} _.-]/gu, "_")
              .slice(0, 100) + ".docx",
          mimeType: mime,
          sizeBytes: bytes.length,
          digest: digest(bytes),
          storageKey: key,
          placeholders: inspection.placeholders
        }
      });
      await audit(tx, actor, row, "uploaded", null, { status: row.status });
      await audit(tx, actor, row, "validated", null, { valid: true, placeholders: inspection.placeholders });
      return row;
    },{timeout:25000,maxWait:10000});
  } catch (err) {
    // Never remove an object after an ambiguous commit until the DB confirms it is unreferenced.
    try {
      if (stored && !(await prisma.documentTemplate.findUnique({ where: { storageKey: key } })))
        await removeFile(actor.schoolId,type,key,version);
      else if(key && !stored) console.error("template.storage.write_unconfirmed",{schoolId:actor.schoolId,type,version});
    } catch {
      console.error("template.storage.cleanup_failed");
    }
    throw err;
  }
}
export async function adminTemplate(actor: SessionUser, id: string) {
  admin(actor);
  const row = await prisma.documentTemplate.findFirst({ where: { id, schoolId: actor.schoolId } });
  check(row, "Modelo indisponível.");
  await scoped(prisma, actor, row.type);
  return row;
}
export async function changeTemplate(
  actor: SessionUser,
  id: string,
  event: "activate" | "archive" | "restore"
) {
  const selected = await adminTemplate(actor, id);
  if (event === "activate") {
    check(selected.previewedAt && selected.status === "DRAFT", "Gere a prévia do rascunho antes de ativar.");
    await inspectDocx(await readOriginal(selected), selected.type);
  }
  return prisma.$transaction(async (tx) => {
    await lock(tx, actor.schoolId);
    const row = await tx.documentTemplate.findFirstOrThrow({ where: { id, schoolId: actor.schoolId } });
    await scoped(tx, actor, row.type);
    if (event === "activate") {
      check(row.status === "DRAFT" && row.previewedAt, "Gere a prévia do rascunho antes de ativar.");
      const previous = await tx.documentTemplate.findFirst({
        where: { schoolId: actor.schoolId, type: row.type, status: "ACTIVE" }
      });
      if (previous) {
        await tx.documentTemplate.update({
          where: { id: previous.id },
          data: { status: "ARCHIVED", archivedAt: new Date() }
        });
        await audit(tx, actor, previous, "archived", { status: "ACTIVE" }, { status: "ARCHIVED" });
      }
      await tx.documentTemplate.update({
        where: { id },
        data: { status: "ACTIVE", activatedAt: new Date() }
      });
      await audit(tx, actor, row, "activated", { status: row.status }, { status: "ACTIVE" });
    } else {
      check(row.status === (event === "restore" ? "ACTIVE" : "DRAFT"), "Estado do modelo incompatível.");
      await tx.documentTemplate.update({
        where: { id },
        data: { status: "ARCHIVED", archivedAt: new Date() }
      });
      await audit(
        tx,
        actor,
        row,
        event === "restore" ? "restored" : "archived",
        { status: row.status },
        { status: "ARCHIVED" }
      );
    }
  });
}
export async function previewTemplate(
  actor: SessionUser,
  id: string,
  type: DocumentTemplateType,
  data: TemplateData
) {
  const row = await adminTemplate(actor, id);
  check(row.type === type && row.status === "DRAFT", "Rascunho indisponível.");
  const parsed = await inspectDocx(await readOriginal(row), type);
  const bytes = await renderBlocks(parsed.blocks, data);
  const done = await prisma.documentTemplate.updateMany({
    where: { id, schoolId: actor.schoolId, status: "DRAFT", digest: row.digest },
    data: { previewedAt: new Date() }
  });
  check(done.count === 1, "O rascunho mudou. Atualize a página.");
  return bytes;
}
export async function issuedDocument(
  actor: SessionUser,
  type: DocumentTemplateType,
  data: TemplateData,
  previewId: string | null,
  standard: () => { bytes: Buffer; filename: string } | Promise<{ bytes: Buffer; filename: string }>
) {
  if (previewId)
    return {
      bytes: await previewTemplate(actor, previewId, type, data),
      filename: "previa-" + type.toLowerCase() + ".pdf"
    };
  try {
    const row = await prisma.documentTemplate.findFirst({
      where: { schoolId: actor.schoolId, type, status: "ACTIVE" }
    });
    if (row) {
      const parsed = await inspectDocx(await readOriginal(row), type);
      return {
        bytes: await renderBlocks(parsed.blocks, data),
        filename: type.toLowerCase() + "-v" + row.version + ".pdf"
      };
    }
  } catch {
    console.error("template.render.fallback", { schoolId: actor.schoolId, type });
  }
  return standard();
}
