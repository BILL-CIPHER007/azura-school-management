import { schoolConfig } from "@/config/school";

export type AcademicStatusContext = {
  isFinal?: boolean;
};

export type SubjectAverageInput = {
  average: number | null | undefined;
  subject: { id?: string; name: string };
};

export type SubjectAverage = {
  subject: string;
  average: number;
};

function averageValidGrades(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function getSubjectAverages(grades: SubjectAverageInput[]) {
  const grouped = new Map<string, { subject: string; values: number[] }>();

  for (const grade of grades) {
    if (typeof grade.average !== "number" || !Number.isFinite(grade.average)) continue;

    const key = grade.subject.id ?? grade.subject.name;
    const current = grouped.get(key) ?? { subject: grade.subject.name, values: [] };
    current.values.push(grade.average);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((item) => ({
      subject: item.subject,
      average: averageValidGrades(item.values)
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "pt-BR"));
}

export function getOverallAverageFromSubjects(subjectAverages: SubjectAverage[]) {
  return averageValidGrades(subjectAverages.map((subject) => subject.average));
}

export function getAcademicStatus(
  averageScore: number,
  attendanceRate: number,
  context: AcademicStatusContext = {}
) {
  const { passingGrade, recoveryGrade, minimumAttendance } = schoolConfig.academic;
  const visibleAverageScore = visibleGrade(averageScore);

  if (visibleAverageScore === 0) return "Cursando";
  if (context.isFinal === false) {
    if (visibleAverageScore < passingGrade || attendanceRate < minimumAttendance) return "Recuperação";
    return "Cursando";
  }

  if (visibleAverageScore >= passingGrade && attendanceRate >= minimumAttendance) return "Aprovado";
  if (visibleAverageScore >= recoveryGrade && attendanceRate >= minimumAttendance) return "Recuperação";
  return "Reprovado";
}

export function getAcademicStatusFromSubjects(
  subjectAverages: SubjectAverage[],
  attendanceRate: number,
  context: AcademicStatusContext = {},
  subjectAttendanceRates: number[] = []
) {
  const { passingGrade, recoveryGrade, minimumAttendance } = schoolConfig.academic;
  const visibleSubjectAverages = subjectAverages.map((subject) => visibleGrade(subject.average));
  const hasEvaluatedSubjects = visibleSubjectAverages.some((value) => value > 0);
  const hasLowAttendance =
    attendanceRate < minimumAttendance ||
    subjectAttendanceRates.some((rate) => Number.isFinite(rate) && rate < minimumAttendance);

  if (!hasEvaluatedSubjects) return "Cursando";

  const hasSubjectBelowPassing = visibleSubjectAverages.some((value) => value > 0 && value < passingGrade);
  const hasSubjectBelowRecovery = visibleSubjectAverages.some((value) => value > 0 && value < recoveryGrade);

  if (context.isFinal === false) {
    if (hasSubjectBelowPassing || hasLowAttendance) return "Recuperação";
    return "Cursando";
  }

  if (hasLowAttendance || hasSubjectBelowRecovery) return "Reprovado";
  if (hasSubjectBelowPassing) return "Recuperação";
  return "Aprovado";
}

export function isAttendanceBelowMinimum(attendanceRate: number) {
  return attendanceRate < schoolConfig.academic.minimumAttendance;
}

export function isPassingGrade(averageScore: number) {
  return averageScore >= schoolConfig.academic.passingGrade;
}

export function visibleGrade(value: number) {
  return Number(value.toFixed(1));
}

export function isPassingVisibleGrade(value: number) {
  return isPassingGrade(visibleGrade(value));
}
