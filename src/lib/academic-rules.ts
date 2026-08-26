import { schoolConfig } from "@/config/school";

export type AcademicStatusContext = {
  isFinal?: boolean;
};

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
