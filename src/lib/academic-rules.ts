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

  if (averageScore === 0) return "Cursando";
  if (context.isFinal === false) {
    if (averageScore < passingGrade || attendanceRate < minimumAttendance) return "Recuperação";
    return "Cursando";
  }

  if (averageScore >= passingGrade && attendanceRate >= minimumAttendance) return "Aprovado";
  if (averageScore >= recoveryGrade && attendanceRate >= minimumAttendance) return "Recuperação";
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
