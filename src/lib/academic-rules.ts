import { schoolConfig } from "@/config/school";

export function getAcademicStatus(averageScore: number, attendanceRate: number) {
  const { passingGrade, recoveryGrade, minimumAttendance } = schoolConfig.academic;

  if (averageScore >= passingGrade && attendanceRate >= minimumAttendance) return "Aprovado";
  if (averageScore >= recoveryGrade && attendanceRate >= minimumAttendance) return "Recuperação";
  if (averageScore === 0) return "Cursando";
  return "Reprovado";
}

export function isAttendanceBelowMinimum(attendanceRate: number) {
  return attendanceRate < schoolConfig.academic.minimumAttendance;
}

export function isPassingGrade(averageScore: number) {
  return averageScore >= schoolConfig.academic.passingGrade;
}
