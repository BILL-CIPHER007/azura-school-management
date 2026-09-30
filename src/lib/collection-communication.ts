import type { CollectionActionType, CollectionChannel, PaymentPromiseStatus } from "@prisma/client";
import { billingCompetenceLabel, formatCurrencyBRL, toCivilDateKey } from "@/lib/financial-core";

export const COLLECTION_COMMUNICATION_RECENT_WINDOW_HOURS = 24;

export const collectionCommunicationTypes = [
  "LEMBRETE_VENCIMENTO",
  "ATRASO_LEVE",
  "ATRASO_MODERADO",
  "ATRASO_CRITICO",
  "PROMESSA_PROXIMA",
  "PROMESSA_VENCIDA"
] as const;

export type CollectionCommunicationType = (typeof collectionCommunicationTypes)[number];

export type CollectionCommunicationContext = {
  guardianName?: string | null;
  studentName: string;
  schoolName: string;
  competence?: string | null;
  amount: number | string | { toString(): string };
  dueDate: Date;
  daysOverdue: number;
  promiseStatus?: PaymentPromiseStatus | null;
  promisedDate?: Date | null;
};

export type GeneratedCollectionMessage = {
  type: CollectionCommunicationType;
  templateId: CollectionCommunicationType;
  title: string;
  body: string;
  variables: Record<string, string>;
};

type Template = {
  title: string;
  body: string;
};

export const collectionCommunicationTypeLabels: Record<CollectionCommunicationType, string> = {
  LEMBRETE_VENCIMENTO: "Lembrete de vencimento",
  ATRASO_LEVE: "Atraso leve",
  ATRASO_MODERADO: "Atraso moderado",
  ATRASO_CRITICO: "Acompanhamento prioritario",
  PROMESSA_PROXIMA: "Lembrete de promessa",
  PROMESSA_VENCIDA: "Promessa vencida"
};

export const collectionChannelLabels: Record<CollectionChannel, string> = {
  PHONE: "Telefone",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  IN_PERSON: "Presencial",
  OTHER: "Outro"
};

export const collectionActionLabels: Record<CollectionActionType, string> = {
  CONTACT: "Contato registrado",
  CONTACTED: "Marcado como contatado",
  NOTE: "Observacao",
  PAYMENT_PROMISE: "Promessa de pagamento"
};

const templates: Record<CollectionCommunicationType, Template> = {
  LEMBRETE_VENCIMENTO: {
    title: "Lembrete de mensalidade",
    body:
      "Ola, {responsavel}.\n\n" +
      "Passando para lembrar sobre a mensalidade de {aluno}, referente a {competencia}, no valor de {valor}, com vencimento em {vencimento}.\n\n" +
      "Caso o pagamento ja tenha sido realizado, desconsidere esta mensagem.\n\n" +
      "Em caso de duvida, entre em contato com a escola."
  },
  ATRASO_LEVE: {
    title: "Mensalidade pendente",
    body:
      "Ola, {responsavel}.\n\n" +
      "Identificamos que a mensalidade de {aluno}, referente a {competencia}, com vencimento em {vencimento}, esta pendente ha {dias_atraso} dia(s).\n\n" +
      "Caso o pagamento ja tenha sido realizado, desconsidere esta mensagem.\n\n" +
      "Em caso de duvida, entre em contato com a escola."
  },
  ATRASO_MODERADO: {
    title: "Acompanhamento de mensalidade",
    body:
      "Ola, {responsavel}.\n\n" +
      "A mensalidade de {aluno}, referente a {competencia}, no valor de {valor}, ainda consta pendente em nosso sistema. O vencimento foi em {vencimento}, ha {dias_atraso} dia(s).\n\n" +
      "Se precisar de apoio ou orientacao, a equipe da {escola} esta a disposicao."
  },
  ATRASO_CRITICO: {
    title: "Regularizacao de mensalidade",
    body:
      "Ola, {responsavel}.\n\n" +
      "Estamos acompanhando a mensalidade de {aluno}, referente a {competencia}, vencida em {vencimento}. Ela ainda consta pendente no sistema da {escola}.\n\n" +
      "Pedimos, por gentileza, que entre em contato com a escola para verificarmos a melhor forma de regularizacao."
  },
  PROMESSA_PROXIMA: {
    title: "Lembrete de combinado",
    body:
      "Ola, {responsavel}.\n\n" +
      "Conforme combinado, lembramos que a mensalidade de {aluno}, referente a {competencia}, segue prevista para regularizacao em {promessa}.\n\n" +
      "Caso ja tenha realizado o pagamento, desconsidere esta mensagem."
  },
  PROMESSA_VENCIDA: {
    title: "Acompanhamento de combinado",
    body:
      "Ola, {responsavel}.\n\n" +
      "A mensalidade de {aluno}, referente a {competencia}, ainda consta pendente apos a data combinada para regularizacao em {promessa}.\n\n" +
      "Pedimos, por gentileza, que entre em contato com a escola para atualizarmos o acompanhamento."
  }
};

export function isCollectionCommunicationType(value: string): value is CollectionCommunicationType {
  return collectionCommunicationTypes.includes(value as CollectionCommunicationType);
}

export function suggestCollectionCommunicationType(context: Pick<CollectionCommunicationContext, "daysOverdue" | "promisedDate" | "promiseStatus">) {
  if (context.promiseStatus === "OVERDUE") return "PROMESSA_VENCIDA";
  if (context.promiseStatus === "OPEN" && context.promisedDate) return "PROMESSA_PROXIMA";
  if (context.daysOverdue <= 0) return "LEMBRETE_VENCIMENTO";
  if (context.daysOverdue <= 5) return "ATRASO_LEVE";
  if (context.daysOverdue <= 15) return "ATRASO_MODERADO";
  return "ATRASO_CRITICO";
}

export function buildCollectionCommunicationVariables(context: CollectionCommunicationContext) {
  return {
    responsavel: context.guardianName?.trim() || "responsavel",
    aluno: context.studentName,
    competencia: context.competence ? billingCompetenceLabel(context.competence) : "mensalidade informada",
    valor: formatCurrencyBRL(context.amount),
    vencimento: toCivilDateKey(context.dueDate).split("-").reverse().join("/"),
    dias_atraso: String(Math.max(0, context.daysOverdue)),
    escola: context.schoolName,
    promessa: context.promisedDate ? toCivilDateKey(context.promisedDate).split("-").reverse().join("/") : "data combinada"
  };
}

export function generateCollectionCommunicationMessage(
  context: CollectionCommunicationContext,
  type: CollectionCommunicationType = suggestCollectionCommunicationType(context)
): GeneratedCollectionMessage {
  const template = templates[type];
  const variables = buildCollectionCommunicationVariables(context);
  const body = Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template.body
  );

  return {
    type,
    templateId: type,
    title: template.title,
    body,
    variables
  };
}

export function getRecentCommunicationCutoff(now = new Date()) {
  return new Date(now.getTime() - COLLECTION_COMMUNICATION_RECENT_WINDOW_HOURS * 60 * 60 * 1000);
}

export function isRecentCommunication(createdAt: Date, now = new Date()) {
  return createdAt.getTime() >= getRecentCommunicationCutoff(now).getTime();
}

export function assertCollectionMessagePrivacy(message: string) {
  const forbiddenPatterns = [
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
    /\bdevedor(?:a)?\b/i,
    /\binadimplente\b/i,
    /\bcritico\b/i,
    /\bnegativ/i,
    /\bprotest/i,
    /\bserasa\b/i
  ];
  return forbiddenPatterns.every((pattern) => !pattern.test(message));
}
