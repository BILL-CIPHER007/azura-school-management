import type { DocumentTemplateType } from "@prisma/client";

export const templateLabels = {
  BOLETIM: "Boletim",
  HISTORICO_ESCOLAR: "Histórico escolar",
  DECLARACAO_MATRICULA: "Declaração de matrícula",
  RECIBO: "Recibo"
} satisfies Record<DocumentTemplateType, string>;
const common = {
  "school.name": "Nome da escola",
  "issue.date": "Data de emissão",
  "student.name": "Nome do aluno"
};
const academic = {
  ...common,
  "student.registration": "Matrícula",
  "class.name": "Turma",
  "academicYear.name": "Ano letivo"
};
const grades = {
  ...academic,
  subjectsTable: "Tabela de disciplinas, notas e frequência",
  finalAverage: "Média geral",
  finalStatus: "Situação acadêmica"
};
export const placeholders = {
  DECLARACAO_MATRICULA: academic,
  BOLETIM: grades,
  HISTORICO_ESCOLAR: grades,
  RECIBO: {
    ...common,
    "guardian.name": "Responsável",
    "charge.description": "Descrição",
    "charge.reference": "Referência",
    "charge.amount": "Valor pago",
    "charge.paidAt": "Data de pagamento",
    "payment.method": "Método de pagamento"
  }
};
export function isTemplateType(value: unknown): value is DocumentTemplateType {
  return typeof value === "string" && Object.hasOwn(templateLabels, value);
}
export class TemplateError extends Error {}
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TemplateError(message);
}
export type TemplateData = {
  values: Record<string, string>;
  tables?: { title: string; headers: string[]; rows: string[][] }[];
};
export function tokens(text: string, type: DocumentTemplateType) {
  const found = [...text.matchAll(/\{\{([^{}]{1,80})\}\}/g)].map((match) => match[1]);
  check(!/\{\{|\}\}/.test(text.replace(/\{\{[^{}]{1,80}\}\}/g, "")), "Campo incompleto ou inválido.");
  const invalid = found.filter((key) => !Object.hasOwn(placeholders[type], key));
  check(!invalid.length, "Campos não permitidos: " + invalid.slice(0, 8).join(", "));
  check(
    !found.includes("subjectsTable") || text.trim() === "{{subjectsTable}}",
    "Use {{subjectsTable}} em um parágrafo separado."
  );
  return found;
}
