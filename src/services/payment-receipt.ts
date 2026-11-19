import type { SessionUser } from "../lib/session";
import { prisma } from "../lib/prisma";
import { issuedDocument } from "./document-templates";
import { basic } from "../lib/document-templates/data";
import { renderBlocks } from "../lib/document-templates/pdf";
import { recordAuditLog } from "../lib/audit";
import { formatDate } from "../lib/utils";

export async function paymentReceipt(actor: SessionUser, chargeId: string, preview: string | null) {
  if (actor.role !== "ADMIN") return new Response(null, { status: 403 });
  const school = await prisma.school.findUnique({
    where: { id: actor.schoolId },
    select: { plan: true, name: true }
  });
  if (school?.plan !== "PROFISSIONAL") return new Response(null, { status: 403 });
  const c = await prisma.charge.findFirst({
    where: { id: chargeId, schoolId: actor.schoolId, student: { schoolId: actor.schoolId } },
    select: {
      id: true,
      status: true,
      paidAt: true,
      refundedAt: true,
      amount: true,
      reference: true,
      description: true,
      billingType: true,
      student: { select: { fullName: true } },
      guardian: { select: { fullName: true, schoolId: true } }
    }
  });
  if (!c) return new Response(null, { status: 404 });
  if (c.status !== "PAID" || !c.paidAt || c.refundedAt)
    return Response.json({ error: "Recibo disponível apenas para cobrança paga." }, { status: 409 });
  const values = {
    ...basic(school.name, c.student.fullName),
    "guardian.name": c.guardian?.schoolId === actor.schoolId ? c.guardian.fullName : "Não informado",
    "charge.description": c.description ?? c.reference,
    "charge.reference": c.reference,
    "charge.amount": new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      c.amount.toNumber()
    ),
    "charge.paidAt": formatDate(c.paidAt),
    "payment.method": c.billingType ?? "Não informado"
  };
  const out = await issuedDocument(actor, "RECIBO", { values }, preview, async () => ({
    filename: "recibo.pdf",
    bytes: await renderBlocks(
      [
        { text: "{{school.name}}", bold: true },
        { text: "Recibo de pagamento", bold: true },
        { text: "Aluno: {{student.name}}" },
        { text: "Responsável: {{guardian.name}}" },
        { text: "Referência: {{charge.reference}}" },
        { text: "Descrição: {{charge.description}}" },
        { text: "Valor recebido: {{charge.amount}}", bold: true },
        { text: "Pagamento: {{charge.paidAt}} · {{payment.method}}" },
        { text: "Emissão: {{issue.date}}" }
      ],
      { values }
    )
  }));
  if (!preview)
    await recordAuditLog(prisma, {
      actor,
      schoolId: actor.schoolId,
      source: "ADMIN",
      action: "document.generated",
      entity: "Charge",
      entityId: c.id,
      metadata: { documentType: "RECIBO" }
    });
  return new Response(new Uint8Array(out.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": (preview ? "inline" : "attachment") + '; filename="' + out.filename + '"'
    }
  });
}
