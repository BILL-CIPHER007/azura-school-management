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

const ISSUED_AT_LABEL = "Emitido automaticamente pelo Sistema de Gestão Escolar Azura.";

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

function addDocumentHeader(pdf: SimplePdf, title: string, schoolName: string, studentName: string) {
  pdf.heading(title, `${schoolName} - ${studentName}`);
  pdf.text(ISSUED_AT_LABEL, undefined, { size: 9, color: "#5b6b82" });
  pdf.text(`Data de emissão: ${formatDate(new Date())}`, undefined, { size: 9, color: "#5b6b82" });
  pdf.line();
}

function addEnrollmentSummary(pdf: SimplePdf, enrollment: AcademicHistoryEnrollment) {
  pdf.row(
    [
      { text: "Ano letivo", width: 82, bold: true },
      { text: String(enrollment.academicYear.year), width: 80 },
      { text: "Turma", width: 62, bold: true },
      { text: `${enrollment.classroom.name} - ${enrollment.classroom.gradeLevel}`, width: 170 },
      { text: "Turno", width: 54, bold: true },
      { text: shiftLabel(enrollment.classroom.shift), width: 51 }
    ],
    { size: 9 }
  );
  pdf.row(
    [
      { text: "Matrícula", width: 82, bold: true },
      { text: enrollment.registration, width: 120 },
      { text: "Status", width: 62, bold: true },
      { text: enrollmentStatusLabel(enrollment.enrollmentStatus), width: 110 },
      { text: "Situação", width: 70, bold: true },
      { text: enrollment.situation, width: 55 }
    ],
    { size: 9 }
  );
  pdf.row(
    [
      { text: "Média geral", width: 82, bold: true },
      { text: formatGrade(enrollment.generalAverage), width: 120 },
      { text: "Frequência", width: 82, bold: true },
      { text: enrollment.overallAttendanceRate === null ? "-" : formatPercent(enrollment.overallAttendanceRate), width: 110 },
      { text: "Estado", width: 70, bold: true },
      { text: enrollment.yearStateLabel, width: 35 }
    ],
    { size: 9 }
  );
}

export function buildAcademicHistoryPdf(input: { schoolName: string; history: AcademicHistoryData }) {
  const pdf = new SimplePdf();
  addDocumentHeader(pdf, "Histórico escolar", input.schoolName, input.history.student.fullName);

  for (const enrollment of input.history.enrollments) {
    pdf.section(`${enrollment.academicYear.year} - ${enrollment.classroom.name}`);
    addEnrollmentSummary(pdf, enrollment);

    if (!enrollment.isClosed) {
      pdf.text("Registro parcial: o ano letivo ainda está em andamento.", undefined, { size: 9, color: "#b45309" });
    }

    pdf.gap(4);
    pdf.row(
      [
        { text: "Disciplina", width: 160, bold: true },
        { text: "Períodos", width: 155, bold: true },
        { text: "Média", width: 60, bold: true },
        { text: "Frequência", width: 75, bold: true },
        { text: "Situação", width: 70, bold: true }
      ],
      { size: 8 }
    );

    for (const subject of enrollment.subjects) {
      const periods = subject.periodGrades.map((period) => `${period.periodName}: ${formatGrade(period.average)}`).join(" | ");
      pdf.row(
        [
          { text: subject.name, width: 160 },
          { text: periods || "-", width: 155 },
          { text: formatGrade(subject.average), width: 60 },
          { text: subject.attendanceRate === null ? "-" : formatPercent(subject.attendanceRate), width: 75 },
          { text: subject.situation, width: 70 }
        ],
        { size: 8 }
      );
    }

    pdf.gap(12);
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
  addDocumentHeader(pdf, "Boletim escolar", input.schoolName, input.studentName);

  pdf.section("Resumo");
  pdf.row(
    [
      { text: "Ano letivo", width: 90, bold: true },
      { text: String(input.enrollment.academicYear.year), width: 85 },
      { text: "Período", width: 70, bold: true },
      { text: input.selectedPeriodLabel, width: 140 },
      { text: "Turma", width: 55, bold: true },
      { text: input.enrollment.classroom.name, width: 80 }
    ],
    { size: 9 }
  );
  pdf.row(
    [
      { text: "Média geral", width: 90, bold: true },
      { text: input.summary.averageGrade.toFixed(1), width: 85 },
      { text: "Frequência", width: 70, bold: true },
      { text: formatPercent(input.summary.attendanceRate), width: 140 },
      { text: "Situação", width: 55, bold: true },
      { text: input.summary.situation, width: 80 }
    ],
    { size: 9 }
  );

  pdf.section("Notas por disciplina");
  pdf.row(
    [
      { text: "Disciplina", width: 130, bold: true },
      ...input.periods.map((period) => ({ text: period.name, width: Math.floor(200 / Math.max(input.periods.length, 1)), bold: true })),
      { text: "Média", width: 52, bold: true },
      { text: "Frequência", width: 62, bold: true },
      { text: "Situação", width: 55, bold: true }
    ],
    { size: 8 }
  );

  for (const row of input.rows) {
    pdf.row(
      [
        { text: row.subject.name, width: 130 },
        ...input.periods.map((period) => ({
          text: formatGrade(row.values.find((item) => item.periodId === period.id)?.value),
          width: Math.floor(200 / Math.max(input.periods.length, 1))
        })),
        { text: row.average.toFixed(1), width: 52 },
        { text: formatPercent(row.attendanceRate), width: 62 },
        { text: row.situation, width: 55 }
      ],
      { size: 8 }
    );
  }

  if (!input.rows.length) {
    pdf.text("Nenhuma nota encontrada para o período selecionado.", undefined, { size: 9, color: "#5b6b82" });
  }

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
  addDocumentHeader(pdf, "Declaração de matrícula", input.schoolName, input.studentName);

  pdf.section("Declaração");
  pdf.text(
    `Declaramos, para os devidos fins, que ${input.studentName} encontra-se matriculado(a) no ano letivo de ${input.enrollment.academicYear.year}, na turma ${input.enrollment.classroom.name}, ${input.enrollment.classroom.gradeLevel}, turno ${shiftLabel(input.enrollment.classroom.shift)}.`,
    undefined,
    { size: 11, color: "#0b2d63" }
  );
  pdf.gap(6);
  pdf.row(
    [
      { text: "Matrícula", width: 100, bold: true },
      { text: input.enrollment.registration, width: 145 },
      { text: "Data de entrada", width: 105, bold: true },
      { text: formatDate(input.enrollment.enrolledAt), width: 170 }
    ],
    { size: 9 }
  );
  pdf.row(
    [
      { text: "Status", width: 100, bold: true },
      { text: enrollmentStatusLabel(input.enrollment.status), width: 145 },
      { text: "Responsável", width: 105, bold: true },
      { text: input.guardianName ?? "-", width: 170 }
    ],
    { size: 9 }
  );
  pdf.gap(28);
  pdf.text("Este documento foi gerado eletronicamente para consulta escolar.", undefined, { size: 9, color: "#5b6b82" });

  return {
    filename: documentFilename("declaracao-matricula", input.studentName),
    bytes: pdf.build()
  };
}
