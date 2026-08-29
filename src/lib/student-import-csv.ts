export const STUDENT_IMPORT_MAX_FILE_SIZE = 256 * 1024;
export const STUDENT_IMPORT_MAX_ROWS = 200;
export const STUDENT_IMPORT_DATE_FORMAT = "DD/MM/AAAA";

export const STUDENT_IMPORT_HEADERS = [
  "nome_aluno",
  "data_nascimento",
  "email_aluno",
  "cpf_aluno",
  "telefone_aluno",
  "nome_responsavel",
  "cpf_responsavel",
  "email_responsavel",
  "telefone_responsavel",
  "parentesco",
  "turma",
  "ano_letivo",
  "data_entrada",
  "matricula"
] as const;

export type StudentImportRow = {
  line: number;
  studentName: string;
  birthDate: string;
  studentEmail: string;
  studentCpf: string;
  studentPhone: string;
  guardianName: string;
  guardianCpf: string;
  guardianEmail: string;
  guardianPhone: string;
  relation: string;
  classroomName: string;
  academicYear: string;
  enrolledAt: string;
  registration: string;
};

export type StudentImportPreviewRow = StudentImportRow & {
  status: "valid" | "error";
  errors: string[];
};

export type StudentCsvImportState = {
  status: "idle" | "preview" | "success" | "error";
  message?: string;
  totalRows: number;
  validRows: number;
  createdRows?: number;
  rows: StudentImportPreviewRow[];
  payload?: string;
};

export const initialStudentCsvImportState: StudentCsvImportState = {
  status: "idle",
  totalRows: 0,
  validRows: 0,
  rows: []
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function detectDelimiter(headerLine: string) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return commas > semicolons ? "," : ";";
}

export function parseStudentImportCsv(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleanText.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return { rows: [] as StudentImportRow[], errors: ["O arquivo CSV está vazio."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const missingHeaders = STUDENT_IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return {
      rows: [] as StudentImportRow[],
      errors: [`Cabeçalho incompleto. Campos ausentes: ${missingHeaders.join(", ")}.`]
    };
  }

  const rows = lines.slice(1, STUDENT_IMPORT_MAX_ROWS + 1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const record = new Map(headers.map((header, headerIndex) => [header, values[headerIndex]?.trim() ?? ""]));

    return {
      line: index + 2,
      studentName: record.get("nome_aluno") ?? "",
      birthDate: record.get("data_nascimento") ?? "",
      studentEmail: (record.get("email_aluno") ?? "").toLowerCase(),
      studentCpf: record.get("cpf_aluno") ?? "",
      studentPhone: record.get("telefone_aluno") ?? "",
      guardianName: record.get("nome_responsavel") ?? "",
      guardianCpf: record.get("cpf_responsavel") ?? "",
      guardianEmail: (record.get("email_responsavel") ?? "").toLowerCase(),
      guardianPhone: record.get("telefone_responsavel") ?? "",
      relation: record.get("parentesco") ?? "",
      classroomName: record.get("turma") ?? "",
      academicYear: record.get("ano_letivo") ?? "",
      enrolledAt: record.get("data_entrada") ?? "",
      registration: record.get("matricula") ?? ""
    };
  });

  const errors =
    lines.length - 1 > STUDENT_IMPORT_MAX_ROWS
      ? [`O arquivo possui mais de ${STUDENT_IMPORT_MAX_ROWS} linhas. Divida a importação em arquivos menores.`]
      : [];

  return { rows, errors };
}

export function buildStudentImportTemplateCsv() {
  const example = [
    "Ana Clara Lima",
    "15/03/2014",
    "ana.clara@example.com",
    "",
    "",
    "Responsável de Ana Clara Lima",
    "",
    "responsavel.ana@example.com",
    "",
    "Responsável",
    "6º Ano A",
    "2026",
    "20/01/2026",
    ""
  ];

  return `${STUDENT_IMPORT_HEADERS.join(";")}\n${example.join(";")}\n`;
}
