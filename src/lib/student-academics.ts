import type { AttendanceStatus } from "@prisma/client";
import { average, gradeSituation } from "@/lib/utils";

type GradeLike = {
  id: string;
  average: number;
  subject: { id: string; name: string };
  academicPeriod: { id: string; name: string; sortOrder: number; academicYear?: { year: number } };
};

type AttendanceLike = {
  id: string;
  status: AttendanceStatus;
  date: Date;
  subject: { id: string; name: string };
};

export function buildGradeRows(grades: GradeLike[], attendanceRate: number) {
  const periods = [
    ...new Map(
      grades
        .map((grade) => [grade.academicPeriod.id, grade.academicPeriod] as const)
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    ).values()
  ];

  const subjects = [
    ...new Map(
      grades
        .map((grade) => [grade.subject.id, grade.subject] as const)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name, "pt-BR"))
    ).values()
  ];

  return subjects.map((subject) => {
    const subjectGrades = grades.filter((grade) => grade.subject.id === subject.id);
    const values = periods.map((period) => {
      const grade = subjectGrades.find((item) => item.academicPeriod.id === period.id);
      return { periodId: period.id, value: grade?.average ?? null };
    });
    const subjectAverage = average(values.map((item) => item.value ?? Number.NaN));

    return {
      subject,
      values,
      average: subjectAverage,
      attendanceRate,
      situation: gradeSituation(subjectAverage, attendanceRate)
    };
  });
}

export function summarizeAttendance(attendances: AttendanceLike[]) {
  const registered = attendances.length;
  const present = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  const absences = attendances.filter((attendance) => attendance.status === "ABSENT").length;
  const justified = attendances.filter((attendance) => attendance.status === "JUSTIFIED").length;
  const attendanceRate = registered ? (present / registered) * 100 : 0;

  const bySubject = new Map<string, { subject: { id: string; name: string }; total: number; present: number }>();
  for (const attendance of attendances) {
    const current = bySubject.get(attendance.subject.id) ?? {
      subject: attendance.subject,
      total: 0,
      present: 0
    };
    current.total += 1;
    if (attendance.status === "PRESENT") current.present += 1;
    bySubject.set(attendance.subject.id, current);
  }

  return {
    registered,
    present,
    absences,
    justified,
    attendanceRate,
    bySubject: [...bySubject.values()]
      .map((item) => ({
        subject: item.subject,
        attendanceRate: item.total ? (item.present / item.total) * 100 : 0,
        total: item.total
      }))
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "pt-BR"))
  };
}

export function latestGrades(grades: GradeLike[], limit = 4) {
  return [...grades]
    .sort((a, b) => b.academicPeriod.sortOrder - a.academicPeriod.sortOrder || a.subject.name.localeCompare(b.subject.name, "pt-BR"))
    .slice(0, limit);
}
