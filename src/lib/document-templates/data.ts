import type { AcademicHistoryData } from "../academic-history";
import type { buildReportCardPdf } from "../academic-documents";
import { formatPercent } from "../utils";
import type { TemplateData } from "../document-template-placeholders";
type Report = Parameters<typeof buildReportCardPdf>[0];
export const grade = (n: number | null | undefined) => (n == null ? "-" : n.toFixed(1).replace(".", ","));
export function basic(school: string, student: string) {
  return {
    "school.name": school,
    "student.name": student,
    "issue.date": new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date())
  };
}
export function academic(
  school: string,
  student: string,
  e?: Pick<Report["enrollment"], "registration" | "classroom" | "academicYear"> | null
) {
  return {
    ...basic(school, student),
    "student.registration": e?.registration ?? "-",
    "class.name": e?.classroom.name ?? "-",
    "academicYear.name": String(e?.academicYear.year ?? "-")
  };
}
export function reportData(input: Report): TemplateData {
  return {
    values: {
      ...academic(input.schoolName, input.studentName, input.enrollment),
      finalAverage: grade(input.summary.averageGrade),
      finalStatus: input.summary.situation
    },
    tables: [
      {
        title: input.selectedPeriodLabel,
        headers: ["Disciplina", ...input.periods.map((p) => p.name), "Média", "Frequência", "Situação"],
        rows: input.rows.map((r) => [
          r.subject.name,
          ...input.periods.map((p) => grade(r.values.find((v) => v.periodId === p.id)?.value)),
          grade(r.average),
          formatPercent(r.attendanceRate),
          r.situation
        ])
      }
    ]
  };
}
export function historyData(school: string, h: AcademicHistoryData): TemplateData {
  const latest = h.enrollments[0];
  return {
    values: {
      ...academic(school, h.student.fullName, latest),
      finalAverage: grade(latest?.generalAverage),
      finalStatus: latest?.situation ?? "-"
    },
    tables: h.enrollments.map((e) => ({
      title: e.academicYear.year + " · " + e.yearStateLabel,
      headers: ["Disciplina", ...e.periods.map((p) => p.name), "Média", "Frequência", "Situação"],
      rows: e.subjects.map((s) => [
        s.name,
        ...e.periods.map((p) => grade(s.periodGrades.find((g) => g.periodId === p.id)?.average)),
        grade(s.average),
        s.attendanceRate === null ? "-" : formatPercent(s.attendanceRate),
        s.situation
      ])
    }))
  };
}
