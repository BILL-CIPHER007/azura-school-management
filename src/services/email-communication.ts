import { hasCommercialFeature } from "@/lib/commercial-plans";
import {
  assertCollectionMessagePrivacy,
  collectionCommunicationTypeLabels,
  getRecentCommunicationCutoff,
  isCollectionCommunicationType,
  type CollectionCommunicationType
} from "@/lib/collection-communication";
import { isChargeDelinquent } from "@/lib/financial-core";
import { prisma } from "@/lib/prisma";

export type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export class EmailCommunicationError extends Error {
  constructor(
    public readonly code:
      | "plano"
      | "cobranca"
      | "status"
      | "destinatario"
      | "assunto"
      | "mensagem"
      | "configuracao"
      | "recente"
      | "duplicidade"
      | "provider",
    message: string
  ) {
    super(message);
    this.name = "EmailCommunicationError";
  }
}

export type SendCollectionEmailInput = {
  chargeId: string;
  communicationType?: string;
  messageTemplate?: string;
  messageBody: string;
  subject?: string;
  note?: string;
  acknowledgedRecentContact?: boolean;
};

type ProviderSendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const RECENT_SEND_GUARD_SECONDS = 10;

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao enviar e-mail.";
  return message.replace(/key|token|secret|authorization/gi, "credencial").slice(0, 240);
}

function providerName() {
  return (process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
}

function isProductionRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function buildCollectionEmailSubject(input: { communicationType?: CollectionCommunicationType | null; schoolName: string }) {
  if (input.communicationType === "LEMBRETE_VENCIMENTO" || input.communicationType === "PROMESSA_PROXIMA") {
    return `Lembrete de mensalidade - ${input.schoolName}`;
  }
  return `Regularizacao de mensalidade - ${input.schoolName}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendInvoiceLink(text: string, invoiceUrl?: string | null) {
  if (!invoiceUrl) return text;
  return `${text}\n\nAbrir fatura de pagamento: ${invoiceUrl}`;
}

function buildEmailHtml(text: string, invoiceUrl?: string | null) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
  const link = invoiceUrl
    ? `<p><a href="${escapeHtml(invoiceUrl)}" style="color:#1455d9;font-weight:700;">Abrir fatura de pagamento</a></p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4f7fb;color:#00285f;font-family:Arial,sans-serif;">
    <main style="max-width:640px;margin:0 auto;padding:24px;">
      <section style="background:#ffffff;border:1px solid #d9e3f4;border-radius:12px;padding:24px;line-height:1.55;">
        ${paragraphs}
        ${link}
      </section>
    </main>
  </body>
</html>`;
}

async function sendWithProvider(input: ProviderSendInput) {
  const provider = providerName();

  if (provider === "mock" || provider === "test") {
    if (input.subject.toLowerCase().includes("falha") || input.to.includes("falha")) {
      throw new Error("Falha simulada do provider de teste.");
    }
    return { provider: "mock", providerMessageId: `mock_${Date.now()}` };
  }

  if (provider !== "resend") {
    throw new EmailCommunicationError("configuracao", "Provider de e-mail nao suportado.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new EmailCommunicationError("configuracao", "Configure RESEND_API_KEY e EMAIL_FROM no servidor.");
  }
  if (isProductionRuntime() && from.toLowerCase().includes("@resend.dev")) {
    throw new EmailCommunicationError("configuracao", "Envio por e-mail ainda nao esta configurado para producao.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    })
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Falha no provider de e-mail.");
  }

  return { provider: "resend", providerMessageId: payload.id ?? null };
}

export async function sendCollectionEmail(schoolId: string, userId: string, input: SendCollectionEmailInput) {
  const school = await prisma.school.findFirstOrThrow({
    where: { id: schoolId },
    select: { id: true, name: true, plan: true }
  });
  if (!hasCommercialFeature(school.plan, "financialModule")) {
    throw new EmailCommunicationError("plano", "Envio de e-mail financeiro disponivel apenas no plano Profissional.");
  }

  const charge = await prisma.charge.findFirst({
    where: { id: input.chargeId, schoolId },
    include: {
      guardian: true,
      student: true,
      collectionActions: {
        where: { channel: "EMAIL" },
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
  if (!charge) throw new EmailCommunicationError("cobranca", "Cobranca nao encontrada.");
  if (!isChargeDelinquent(charge.status, charge.dueDate)) {
    throw new EmailCommunicationError("status", "Esta cobranca nao esta inadimplente.");
  }
  if (!charge.guardian) {
    throw new EmailCommunicationError("destinatario", "A cobranca nao possui responsavel vinculado.");
  }

  const recipient = normalizeEmail(charge.guardian.email);
  if (!recipient || !isValidEmail(recipient)) {
    throw new EmailCommunicationError("destinatario", "O responsavel nao possui e-mail valido cadastrado.");
  }

  const communicationType: CollectionCommunicationType | null =
    input.communicationType && isCollectionCommunicationType(input.communicationType) ? input.communicationType : null;
  if (input.communicationType && !communicationType) {
    throw new EmailCommunicationError("mensagem", "Tipo de comunicacao invalido.");
  }

  const messageTemplate = input.messageTemplate?.trim() ? input.messageTemplate.trim().slice(0, 80) : communicationType;
  const body = input.messageBody.trim().slice(0, 2500);
  if (!body) throw new EmailCommunicationError("mensagem", "Informe a mensagem do e-mail.");
  if (!assertCollectionMessagePrivacy(body)) {
    throw new EmailCommunicationError("mensagem", "A mensagem contem termos ou dados nao permitidos.");
  }

  const subject = (input.subject?.trim() || buildCollectionEmailSubject({ communicationType, schoolName: school.name })).slice(0, 120);
  if (!subject) throw new EmailCommunicationError("assunto", "Informe o assunto do e-mail.");
  if (!assertCollectionMessagePrivacy(subject)) {
    throw new EmailCommunicationError("assunto", "O assunto contem termos ou dados nao permitidos.");
  }

  const recentContact = charge.collectionActions.find(
    (action) =>
      action.type === "CONTACT" &&
      action.createdAt >= getRecentCommunicationCutoff() &&
      (action.deliveryStatus === "SENT" || Boolean(action.messageBody))
  );
  if (recentContact && !input.acknowledgedRecentContact) {
    throw new EmailCommunicationError("recente", "Ja existe contato recente. Confirme antes de enviar novamente.");
  }

  const sendGuard = new Date(Date.now() - RECENT_SEND_GUARD_SECONDS * 1000);
  const duplicate = charge.collectionActions.find(
    (action) =>
      action.createdAt >= sendGuard &&
      (action.deliveryStatus === "PENDING" || action.deliveryStatus === "SENT")
  );
  if (duplicate) {
    throw new EmailCommunicationError("duplicidade", "Aguarde alguns segundos antes de reenviar este e-mail.");
  }

  const note = input.note?.trim() ? input.note.trim().slice(0, 600) : null;
  const text = appendInvoiceLink(body, charge.invoiceUrl);
  const html = buildEmailHtml(body, charge.invoiceUrl);

  const pendingAction = await prisma.collectionAction.create({
    data: {
      schoolId,
      chargeId: charge.id,
      type: "CONTACT",
      channel: "EMAIL",
      communicationType,
      messageTemplate,
      messageBody: body,
      deliveryStatus: "PENDING",
      provider: providerName(),
      recipient,
      subject,
      note,
      createdById: userId
    }
  });

  try {
    const result = await sendWithProvider({ to: recipient, subject, text, html });
    await prisma.$transaction(async (tx) => {
      await tx.collectionAction.update({
        where: { id: pendingAction.id },
        data: {
          deliveryStatus: "SENT",
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          deliveryError: null
        }
      });
      await tx.chargeFinancialEvent.create({
        data: {
          schoolId,
          chargeId: charge.id,
          userId,
          source: "ADMIN",
          action: "financial_charge.collection_email_sent",
          message: `${communicationType ? collectionCommunicationTypeLabels[communicationType] : "E-mail de cobranca"} enviado para ${maskEmail(recipient)}.`,
          externalEventId: result.providerMessageId
        }
      });
    });
    return { actionId: pendingAction.id, status: "SENT" as const };
  } catch (error) {
    const deliveryError =
      error instanceof EmailCommunicationError && error.code !== "provider" ? error.message : sanitizeProviderError(error);
    await prisma.$transaction(async (tx) => {
      await tx.collectionAction.update({
        where: { id: pendingAction.id },
        data: {
          deliveryStatus: "FAILED",
          deliveryError
        }
      });
      await tx.chargeFinancialEvent.create({
        data: {
          schoolId,
          chargeId: charge.id,
          userId,
          source: "ADMIN",
          action: "financial_charge.collection_email_failed",
          message: `Falha ao enviar e-mail de cobranca para ${maskEmail(recipient)}: ${deliveryError}`
        }
      });
    });
    throw new EmailCommunicationError("provider", "Nao foi possivel enviar o e-mail. A tentativa foi registrada.");
  }
}

export function maskEmail(value?: string | null) {
  const email = normalizeEmail(value);
  const [local, domain] = email.split("@");
  if (!local || !domain) return "e-mail nao informado";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}
