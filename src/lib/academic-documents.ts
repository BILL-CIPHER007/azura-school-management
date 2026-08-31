import type { EnrollmentStatus, Shift } from "@prisma/client";
import type { AcademicHistoryData, AcademicHistoryEnrollment } from "@/lib/academic-history";
import { enrollmentStatusLabel, shiftLabel } from "@/lib/admin-labels";
import { SimplePdf } from "@/lib/simple-pdf";
import { formatDate, formatPercent } from "@/lib/utils";

type ReportPeriod = {
  id: string;
  name: string;
};

type ReportRow = {
  subject: { id: string; name: string };
  values: Array<{ periodId: string; value: number | null }>;
  average: number;
  attendanceRate: number;
  situation: string;
};

type ReportSummary = {
  averageGrade: number;
  attendanceRate: number;
  subjectAverages: unknown[];
  situation: string;
};

type DeclarationEnrollment = {
  registration: string;
  enrolledAt: Date;
  status: EnrollmentStatus;
  academicYear: { year: number };
  classroom: { name: string; gradeLevel: string; shift: Shift };
};

type InfoItem = {
  label: string;
  value?: string | null;
};

const ISSUED_AT_LABEL = "Documento gerado eletronicamente pelo Sistema de Gestão Escolar Azura.";

const pdfTheme = {
  navy: "#062b63",
  navyText: "#08285c",
  blue: "#0f63ff",
  blueSoft: "#eef5ff",
  border: "#d8e5f5",
  muted: "#61718a",
  row: "#f7faff",
  success: "#0f7a45",
  warning: "#b45309",
  danger: "#b91c1c"
};

function filenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function formatGrade(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "-" : value.toFixed(1);
}

function documentFilename(kind: string, studentName: string) {
  return `${kind}-${filenamePart(studentName) || "aluno"}.pdf`;
}

function statusColor(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("aprov") || normalized.includes("regular") || normalized.includes("cursando")) return pdfTheme.success;
  if (normalized.includes("recuper") || normalized.includes("aten")) return pdfTheme.warning;
  if (normalized.includes("reprov") || normalized.includes("baixa")) return pdfTheme.danger;
  return pdfTheme.navyText;
}

function valueOrDash(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function drawDocumentFrame(pdf: SimplePdf, schoolName: string) {
  pdf.setFooter(ISSUED_AT_LABEL, "Azura");

  const topY = pdf.cursorY - 8;
  pdf.textAt(schoolName, pdf.margin, topY, { size: 15, bold: true, color: pdfTheme.navy });
  pdf.textAt("Documento acadêmico", pdf.margin, topY - 16, { size: 9, color: pdfTheme.muted });
  pdf.textAt("Azura", pdf.margin, topY, { size: 14, bold: true, color: pdfTheme.blue, align: "right" });
  pdf.textAt("Sistema de Gestão Escolar", pdf.margin, topY - 15, { size: 8, color: pdfTheme.muted, align: "right" });
  pdf.lineAt(pdf.margin, topY - 30, pdf.pageWidth - pdf.margin, topY - 30, pdfTheme.navy, 1.2);
  pdf.moveDown(58);
}

function drawTitle(pdf: SimplePdf, title: string, subtitle?: string) {
  pdf.ensureSpace(64);
  pdf.text(title, pdf.margin, { size: 22, bold: true, color: pdfTheme.navy });
  if (subtitle) pdf.text(subtitle, pdf.margin, { size: 9, color: pdfTheme.muted });
  pdf.moveDown(8);
}

function drawSectionTitle(pdf: SimplePdf, title: string) {
  pdf.ensureSpace(32);
  pdf.text(title, pdf.margin, { size: 12, bold: true, color: pdfTheme.navy });
  pdf.lineAt(pdf.margin, pdf.cursorY + 4, pdf.margin + 34, pdf.cursorY + 4, pdfTheme.blue, 1.5);
  pdf.moveDown(5);
}

function drawInfoGrid(pdf: SimplePdf, items: InfoItem[], columns = 3) {
  const gap = 10;
  const rows = Math.ceil(items.length / columns);
  const cellWidth = (pdf.contentWidth - gap * (columns - 1)) / columns;
  const cellHeight = 45;
  const totalHeight = rows * cellHeight + Math.max(rows - 1, 0) * gap;

  pdf.ensureSpace(totalHeight + 10);
  const startY = pdf.cursorY;

  items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = pdf.margin + column * (cellWidth + gap);
    const y = startY - (row + 1) * cellHeight - row * gap;
    pdf.rect(x, y, cellWidth, cellHeight, { fill: "#ffffff", stroke: pdfTheme.border, strokeWidth: 0.7 });
    pdf.textAt(item.label, x + 10, y + cellHeight - 17, { size: 7, bold: true, color: pdfTheme.muted });
    pdf.textAt(valueOrDash(item.value), x + 10, y + cellHeight - 32, { size: 9, bold: true, color: pdfTheme.navyText });
  });

  pdf.moveDown(totalHeight + 12);
}

function drawSummaryGrid(pdf: SimplePdf, items: InfoItem[]) {
  const columns = Math.min(items.length, 4);
  const gap = 8;
  const cellWidth = (pdf.contentWidth - gap * (columns - 1)) / columns;
  const cellHeight = 54;

  pdf.ensureSpace(cellHeight + 16);
  const y = pdf.cursorY - cellHeight;
  pdf.rect(pdf.margin, y, pdf.contentWidth, cellHeight, { fill: pdfTheme.blueSoft, stroke: pdfTheme.border, strokeWidth: 0.7 });

  items.forEach((item, index) => {
    const x = pdf.margin + index * (cellWidth + gap);
    if (index > 0) pdf.lineAt(x - gap / 2, y + 10, x - gap / 2, y + cellHeight - 10, pdfTheme.border, 0.6);
    pdf.textAt(item.label, x + 10, y + cellHeight - 20, { size: 7, bold: true, color: pdfTheme.muted });
    pdf.textAt(valueOrDash(item.value), x + 10, y + cellHeight - 38, {
      size: 11,
      bold: true,
      color: item.label.toLowerCase().includes("situação") ? statusColor(item.value ?? "") : pdfTheme.navy
    });
  });

  pdf.moveDown(cellHeight + 16);
}

function drawNote(pdf: SimplePdf, title: string, text: string, color = pdfTheme.muted) {
  pdf.ensureSpace(54);
  const height = 48;
  const y = pdf.cursorY - height;
  pdf.rect(pdf.margin, y, pdf.contentWidth, height, { fill: pdfTheme.blueSoft, stroke: pdfTheme.border, strokeWidth: 0.7 });
  pdf.textAt(title, pdf.margin + 12, y + 29, { size: 9, bold: true, color: pdfTheme.navy });
  pdf.textAt(text, pdf.margin + 12, y + 14, { size: 8, color });
  pdf.moveDown(height + 12);
}

function drawMetadata(pdf: SimplePdf, studentName: string) {
  pdf.text(`Aluno(a): ${studentName}`, pdf.margin, { size: 9, bold: true, color: pdfTheme.navyText });
  pdf.text(ISSUED_AT_LABEL, pdf.margin, { size: 8, color: pdfTheme.muted });
  pdf.text(`Data de emissão: ${formatDate(new Date())}`, pdf.margin, { size: 8, color: pdfTheme.navyText });
  pdf.moveDown(8);
}

function addEnrollmentSummary(pdf: SimplePdf, enrollment: AcademicHistoryEnrollment) {
  drawSummaryGrid(pdf, [
    { label: "Ano letivo", value: String(enrollment.academicYear.year) },
    { label: "Turma", value: `${enrollment.classroom.name} · ${enrollment.classroom.gradeLevel}` },
    { label: "Turno", value: shiftLabel(enrollment.classroom.shift) },
    { label: "Situação", value: enrollment.situation }
  ]);

  drawInfoGrid(
    pdf,
    [
      { label: "Matrícula", value: enrollment.registration },
      { label: "Status da matrícula", value: enrollmentStatusLabel(enrollment.enrollmentStatus) },
      { label: "Estado do ano", value: enrollment.yearStateLabel },
      { label: "Média geral", value: formatGrade(enrollment.generalAverage) },
      {
        label: "Frequência geral",
        value: enrollment.overallAttendanceRate === null ? "-" : formatPercent(enrollment.overallAttendanceRate)
      },
      { label: "Aulas registradas", value: String(enrollment.attendanceTotal) }
    ],
    3
  );
}

export function buildAcademicHistoryPdf(input: { schoolName: string; history: AcademicHistoryData }) {
  const pdf = new SimplePdf();
  drawDocumentFrame(pdf, input.schoolName);
  drawTitle(pdf, "Histórico Escolar");
  drawMetadata(pdf, input.history.student.fullName);

  if (!input.history.enrollments.length) {
    drawNote(pdf, "Histórico escolar", "Nenhuma matrícula encontrada para este aluno.");
  }

  for (const enrollment of input.history.enrollments) {
    drawSectionTitle(pdf, String(enrollment.academicYear.year));
    addEnrollmentSummary(pdf, enrollment);

    if (!enrollment.isClosed) {
      drawNote(pdf, "Registro parcial", "O ano letivo ainda está em andamento.", pdfTheme.warning);
    }

    pdf.table(
      [
        { text: "Disciplina", width: 205 },
        { text: "Média", width: 70, align: "center" },
        { text: "Frequência", width: 90, align: "center" },
        { text: "Situação", width: 130, align: "center" }
      ],
      enrollment.subjects.map((subject) => [
        { text: subject.name, bold: true },
        { text: formatGrade(subject.average), align: "center" },
        { text: subject.attendanceRate === null ? "-" : formatPercent(subject.attendanceRate), align: "center" },
        { text: subject.situation, color: statusColor(subject.situation), bold: true, align: "center" }
      ])
    );
  }

  return {
    filename: documentFilename("historico-escolar", input.history.student.fullName),
    bytes: pdf.build()
  };
}

export function buildReportCardPdf(input: {
  schoolName: string;
  studentName: string;
  enrollment: DeclarationEnrollment;
  periods: ReportPeriod[];
  rows: ReportRow[];
  summary: ReportSummary;
  selectedPeriodLabel: string;
}) {
  const pdf = new SimplePdf();
  drawDocumentFrame(pdf, input.schoolName);
  drawTitle(pdf, "Boletim Escolar");
  drawMetadata(pdf, input.studentName);

  drawSectionTitle(pdf, "Identificação");
  drawInfoGrid(pdf, [
    { label: "Aluno(a)", value: input.studentName },
    { label: "Matrícula", value: input.enrollment.registration },
    { label: "Ano letivo", value: String(input.enrollment.academicYear.year) },
    { label: "Turma", value: input.enrollment.classroom.name },
    { label: "Turno", value: shiftLabel(input.enrollment.classroom.shift) },
    { label: "Período", value: input.selectedPeriodLabel }
  ]);

  drawSectionTitle(pdf, "Resumo do desempenho");
  drawSummaryGrid(pdf, [
    { label: "Média geral", value: input.summary.averageGrade.toFixed(1) },
    { label: "Frequência geral", value: formatPercent(input.summary.attendanceRate) },
    { label: "Situação", value: input.summary.situation },
    { label: "Período", value: input.selectedPeriodLabel }
  ]);

  drawSectionTitle(pdf, "Notas por disciplina");
  const periodWidth = Math.floor((pdf.contentWidth - 125 - 55 - 66 - 76) / Math.max(input.periods.length, 1));
  pdf.table(
    [
      { text: "Disciplina", width: 125 },
      ...input.periods.map((period) => ({ text: period.name, width: periodWidth, align: "center" as const })),
      { text: "Média", width: 55, align: "center" },
      { text: "Frequência", width: 66, align: "center" },
      { text: "Situação", width: 76, align: "center" }
    ],
    input.rows.map((row) => [
      { text: row.subject.name, bold: true },
      ...input.periods.map((period) => ({
        text: formatGrade(row.values.find((item) => item.periodId === period.id)?.value),
        align: "center" as const
      })),
      { text: row.average.toFixed(1), bold: true, align: "center" },
      { text: formatPercent(row.attendanceRate), align: "center" },
      { text: row.situation, color: statusColor(row.situation), bold: true, align: "center" }
    ])
  );

  if (!input.rows.length) {
    drawNote(pdf, "Notas por disciplina", "Nenhuma nota encontrada para o período selecionado.");
  }

  drawNote(pdf, "Observação", "As médias apresentadas são calculadas conforme as regras acadêmicas configuradas no sistema.");

  return {
    filename: documentFilename("boletim", input.studentName),
    bytes: pdf.build()
  };
}

export function buildEnrollmentDeclarationPdf(input: {
  schoolName: string;
  studentName: string;
  enrollment: DeclarationEnrollment;
  guardianName?: string | null;
}) {
  const pdf = new SimplePdf();
  drawDocumentFrame(pdf, input.schoolName);
  drawTitle(pdf, "Declaração de Matrícula");
  drawMetadata(pdf, input.studentName);

  drawSectionTitle(pdf, "Declaração");
  pdf.text(
    `Declaramos, para os devidos fins, que ${input.studentName} possui matrícula ativa nesta instituição de ensino, no ano letivo de ${input.enrollment.academicYear.year}, na turma ${input.enrollment.classroom.name}, turno ${shiftLabel(input.enrollment.classroom.shift)}.`,
    pdf.margin,
    { size: 11, color: pdfTheme.navyText }
  );
  pdf.moveDown(12);

  drawSectionTitle(pdf, "Informações da matrícula");
  drawInfoGrid(pdf, [
    { label: "Matrícula", value: input.enrollment.registration },
    { label: "Data de entrada", value: formatDate(input.enrollment.enrolledAt) },
    { label: "Status", value: enrollmentStatusLabel(input.enrollment.status) },
    { label: "Responsável", value: input.guardianName },
    { label: "Turma", value: input.enrollment.classroom.name },
    { label: "Ano letivo", value: String(input.enrollment.academicYear.year) },
    { label: "Turno", value: shiftLabel(input.enrollment.classroom.shift) }
  ]);

  pdf.moveDown(18);
  pdf.lineAt(pdf.margin, pdf.cursorY, pdf.margin + 210, pdf.cursorY, pdfTheme.navy, 0.8);
  pdf.moveDown(14);
  pdf.text("Assinatura / Secretaria Escolar", pdf.margin + 34, { size: 8, color: pdfTheme.muted });

  return {
    filename: documentFilename("declaracao-matricula", input.studentName),
    bytes: pdf.build()
  };
}
