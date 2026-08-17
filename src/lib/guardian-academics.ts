import type { AttendanceStatus } from "@prisma/client";
import { average, gradeSituation } from "@/lib/utils";

type GradeLike = {
  id: string;
  average: number;
  updatedAt?: Date;
  subject: { id: string; name: string };
  academicPeriod: { id: string; name: string; sortOrder: number; academicYear?: { year: number } };
};

type AttendanceLike = {
  id: string;
  status: AttendanceStatus;
  date: Date;
  subject: { id: string; name: string };
};

export function buildGuardianGradeRows(grades: GradeLike[], attendanceRate: number) {
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

export function summarizeGuardianAttendance(attendances: AttendanceLike[]) {
  const registered = attendances.length;
  const present = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  const absences = attendances.filter((attendance) => attendance.status === "ABSENT").length;
  const justified = attendances.filter((attendance) => attendance.status === "JUSTIFIED").length;
  const attendanceRate = registered ? (present / registered) * 100 : 0;

  const bySubject = new Map<string, { subject: { id: string; name: string }; total: number; present: number; absences: number }>();
  for (const attendance of attendances) {
    const current = bySubject.get(attendance.subject.id) ?? {
      subject: attendance.subject,
      total: 0,
      present: 0,
      absences: 0
    };
    current.total += 1;
    if (attendance.status === "PRESENT") current.present += 1;
    if (attendance.status === "ABSENT") current.absences += 1;
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
        absences: item.absences,
        total: item.total
      }))
      .sort((a, b) => a.attendanceRate - b.attendanceRate || a.subject.name.localeCompare(b.subject.name, "pt-BR"))
  };
}

export function latestGuardianGrades(grades: GradeLike[], limit = 5) {
  const sorted = [...grades]
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA || b.academicPeriod.sortOrder - a.academicPeriod.sortOrder;
    });
  const bySubject = new Map<string, GradeLike>();

  for (const grade of sorted) {
    if (!bySubject.has(grade.subject.id)) {
      bySubject.set(grade.subject.id, grade);
    }
  }

  return [...bySubject.values()].slice(0, limit);
}

export function buildGuardianAttention({
  gradeRows,
  attendanceRate,
  attendances
}: {
  gradeRows: Array<{ subject: { name: string }; average: number }>;
  attendanceRate: number;
  attendances: AttendanceLike[];
}) {
  const alerts: Array<{ title: string; value: string; description: string }> = [];
  const lowSubjects = gradeRows.filter((row) => row.average > 0 && row.average < 7).slice(0, 3);

  for (const subject of lowSubjects) {
    alerts.push({
      title: subject.subject.name,
      value: `Média ${subject.average.toFixed(1)}`,
      description: "Abaixo da média esperada"
    });
  }

  if (attendanceRate > 0 && attendanceRate < 85) {
    alerts.push({
      title: "Frequência",
      value: `${Math.round(attendanceRate)}%`,
      description: "Próxima do limite mínimo"
    });
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const recentAbsences = attendances.filter(
    (attendance) => attendance.status === "ABSENT" && attendance.date >= since
  ).length;

  if (recentAbsences > 0) {
    alerts.push({
      title: `${recentAbsences} faltas recentes`,
      value: "Últimos 14 dias",
      description: "Vale acompanhar a regularidade"
    });
  }

  return alerts;
}
