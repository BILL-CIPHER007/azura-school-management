import type { AttendanceStatus, EnrollmentStatus, Shift } from "@prisma/client";
import {
  getAcademicStatus,
  getAcademicStatusFromSubjects,
  getOverallAverageFromSubjects,
  type SubjectAverage,
  visibleGrade
} from "@/lib/academic-rules";

type HistorySubject = {
  id: string;
  name: string;
};

type HistoryPeriod = {
  id: string;
  name: string;
  sortOrder: number;
  closedAt?: Date | null;
};

export type AcademicHistorySource = {
  id: string;
  fullName: string;
  enrollments: Array<{
    id: string;
    registration: string;
    enrolledAt: Date;
    status: EnrollmentStatus;
    academicYear: {
      id: string;
      year: number;
      closedAt?: Date | null;
      periods?: HistoryPeriod[];
    };
    classroom: {
      id: string;
      name: string;
      gradeLevel: string;
      shift: Shift;
      assignments?: Array<{ subject: HistorySubject }>;
    };
    grades: Array<{
      id: string;
      average: number;
      subject: HistorySubject;
      academicPeriod: HistoryPeriod;
    }>;
    attendances: Array<{
      id: string;
      status: AttendanceStatus;
      date: Date;
      subject: HistorySubject;
    }>;
  }>;
};

export type AcademicHistorySubject = {
  id: string;
  name: string;
  periodGrades: Array<{ periodId: string; periodName: string; average: number | null }>;
  average: number | null;
  attendanceRate: number | null;
  attendanceTotal: number;
  situation: string;
};

export type AcademicHistoryEnrollment = {
  id: string;
  registration: string;
  enrolledAt: Date;
  enrollmentStatus: EnrollmentStatus;
  academicYear: { id: string; year: number; closedAt?: Date | null };
  classroom: { id: string; name: string; gradeLevel: string; shift: Shift };
  isClosed: boolean;
  yearStateLabel: "Encerrado" | "Em andamento";
  periods: HistoryPeriod[];
  subjects: AcademicHistorySubject[];
  generalAverage: number | null;
  overallAttendanceRate: number | null;
  attendanceTotal: number;
  situation: string;
  hasAcademicRecords: boolean;
};

export type AcademicHistoryData = {
  student: { id: string; fullName: string };
  enrollments: AcademicHistoryEnrollment[];
};

function averageOrNull(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function attendanceRate(attendances: Array<{ status: AttendanceStatus }>) {
  if (!attendances.length) return null;
  const present = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  return (present / attendances.length) * 100;
}

function sortSubjects(first: HistorySubject, second: HistorySubject) {
  return first.name.localeCompare(second.name, "pt-BR");
}

function sortPeriods(first: HistoryPeriod, second: HistoryPeriod) {
  return first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, "pt-BR");
}

export function buildStudentAcademicHistory(source: AcademicHistorySource): AcademicHistoryData {
  const enrollments = [...source.enrollments]
    .sort(
      (first, second) =>
        second.academicYear.year - first.academicYear.year ||
        new Date(second.enrolledAt).getTime() - new Date(first.enrolledAt).getTime()
    )
    .map((enrollment) => {
      const periods = [
        ...new Map(
          [
            ...(enrollment.academicYear.periods ?? []),
            ...enrollment.grades.map((grade) => grade.academicPeriod)
          ]
            .sort(sortPeriods)
            .map((period) => [period.id, period] as const)
        ).values()
      ];

      const subjects = [
        ...new Map(
          [
            ...(enrollment.classroom.assignments ?? []).map((assignment) => assignment.subject),
            ...enrollment.grades.map((grade) => grade.subject),
            ...enrollment.attendances.map((attendance) => attendance.subject)
          ]
            .sort(sortSubjects)
            .map((subject) => [subject.id, subject] as const)
        ).values()
      ];

      const overallAttendanceRate = attendanceRate(enrollment.attendances);
      const subjectRows = subjects.map((subject) => {
        const subjectGrades = enrollment.grades.filter((grade) => grade.subject.id === subject.id);
        const subjectAttendances = enrollment.attendances.filter((attendance) => attendance.subject.id === subject.id);
        const periodGrades = periods.map((period) => {
          const grade = subjectGrades.find((item) => item.academicPeriod.id === period.id);
          return { periodId: period.id, periodName: period.name, average: grade?.average ?? null };
        });
        const subjectAverage = averageOrNull(periodGrades.map((item) => item.average));
        const subjectAttendanceRate = attendanceRate(subjectAttendances);
        const subjectRateForRules = subjectAttendanceRate ?? overallAttendanceRate ?? 0;

        return {
          id: subject.id,
          name: subject.name,
          periodGrades,
          average: subjectAverage === null ? null : visibleGrade(subjectAverage),
          attendanceRate: subjectAttendanceRate,
          attendanceTotal: subjectAttendances.length,
          situation:
            subjectAverage === null
              ? "Sem nota"
              : getAcademicStatus(visibleGrade(subjectAverage), subjectRateForRules, {
                  isFinal: Boolean(enrollment.academicYear.closedAt)
                })
        };
      });

      const subjectAverages: SubjectAverage[] = subjectRows
        .filter((subject): subject is AcademicHistorySubject & { average: number } => subject.average !== null)
        .map((subject) => ({ subject: subject.name, average: subject.average }));
      const subjectAttendanceRates = subjectRows
        .map((subject) => subject.attendanceRate)
        .filter((rate): rate is number => Number.isFinite(rate));
      const generalAverage = subjectAverages.length ? visibleGrade(getOverallAverageFromSubjects(subjectAverages)) : null;
      const attendanceRateForRules = overallAttendanceRate ?? 0;
      const isClosed = Boolean(enrollment.academicYear.closedAt);

      return {
        id: enrollment.id,
        registration: enrollment.registration,
        enrolledAt: enrollment.enrolledAt,
        enrollmentStatus: enrollment.status,
        academicYear: enrollment.academicYear,
        classroom: enrollment.classroom,
        isClosed,
        yearStateLabel: isClosed ? "Encerrado" : "Em andamento",
        periods,
        subjects: subjectRows,
        generalAverage,
        overallAttendanceRate,
        attendanceTotal: enrollment.attendances.length,
        situation: subjectAverages.length
          ? getAcademicStatusFromSubjects(subjectAverages, attendanceRateForRules, { isFinal: isClosed }, subjectAttendanceRates)
          : "Cursando",
        hasAcademicRecords: enrollment.grades.length > 0 || enrollment.attendances.length > 0
      } satisfies AcademicHistoryEnrollment;
    });

  return {
    student: { id: source.id, fullName: source.fullName },
    enrollments
  };
}
