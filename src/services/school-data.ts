import type { AttendanceStatus, EnrollmentStatus, Prisma, UserStatus } from "@prisma/client";
import { schoolConfig } from "@/config/school";
import {
  getAcademicStatusFromSubjects,
  getOverallAverageFromSubjects,
  getSubjectAverages,
  isAttendanceBelowMinimum,
  isPassingVisibleGrade
} from "@/lib/academic-rules";
import { guardianAnnouncementWhere, studentAnnouncementWhere, teacherAnnouncementWhere } from "@/lib/announcements";
import { prisma } from "@/lib/prisma";
import { average, gradeSituation } from "@/lib/utils";

function academicTimelineStart() {
  return new Date(`${schoolConfig.academic.academicYear}-08-01`);
}

type AttentionEnrollment = {
  grades: Array<{ average: number; subject?: { id?: string; name: string } }>;
  attendances: Array<{ status: AttendanceStatus; subject?: { id?: string; name: string } }>;
};

function summarizeAttentionEnrollment(enrollment: AttentionEnrollment) {
  const subjectAverages = subjectAveragesFromGrades(enrollment.grades);
  const averageGrade = subjectAverages.length
    ? getOverallAverageFromSubjects(subjectAverages)
    : average(enrollment.grades.map((grade) => grade.average));
  const attendanceRate = enrollment.attendances.length
    ? (enrollment.attendances.filter((attendance) => attendance.status === "PRESENT").length /
        enrollment.attendances.length) *
      100
    : 0;
  const situation = subjectAverages.length
    ? getAcademicStatusFromSubjects(subjectAverages, attendanceRate, { isFinal: false }, subjectAttendanceRatesFromAttendances(enrollment.attendances))
    : gradeSituation(averageGrade, attendanceRate, { isFinal: false });
  const isAttendanceLow = enrollment.attendances.length > 0 && isAttendanceBelowMinimum(attendanceRate);
  const isGradeLow = subjectAverages.some((subject) => subject.average > 0 && !isPassingVisibleGrade(subject.average));
  const reasons = [
    isAttendanceLow ? "Frequência baixa" : null,
    isGradeLow || situation === "Recuperação" ? "Em recuperação" : null
  ].filter(Boolean) as string[];

  return {
    averageGrade,
    attendanceRate,
    situation,
    reasons: [...new Set(reasons)]
  };
}

function attendanceRateFromStatuses(attendances: Array<{ status: AttendanceStatus }>) {
  if (!attendances.length) return 0;
  const present = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  return (present / attendances.length) * 100;
}

function subjectAveragesFromGrades(grades: Array<{ average: number; subject?: { id?: string; name: string } }>) {
  return getSubjectAverages(grades.filter((grade) => grade.subject) as Array<{ average: number; subject: { id?: string; name: string } }>);
}

function subjectAttendanceRatesFromAttendances(attendances: Array<{ status: AttendanceStatus; subject?: { id?: string; name: string } }>) {
  const grouped = new Map<string, { present: number; total: number }>();

  for (const attendance of attendances) {
    if (!attendance.subject) continue;

    const key = attendance.subject.id ?? attendance.subject.name;
    const current = grouped.get(key) ?? { present: 0, total: 0 };
    current.total += 1;
    if (attendance.status === "PRESENT") current.present += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].map((item) => (item.total ? (item.present / item.total) * 100 : 0));
}

function attentionReasons(input: {
  averageGrade: number;
  attendanceRate: number;
  attendanceTotal: number;
  subjectAverages: Array<{ subject: string; average: number }>;
}) {
  const lowSubjects = input.subjectAverages.filter((subject) => subject.average > 0 && !isPassingVisibleGrade(subject.average));
  const reasons = [
    input.attendanceTotal > 0 && isAttendanceBelowMinimum(input.attendanceRate)
      ? "Frequência abaixo do mínimo"
      : null,
    lowSubjects.length
      ? `Média abaixo da mínima em ${lowSubjects
          .slice(0, 2)
          .map((subject) => subject.subject)
          .join(", ")}${lowSubjects.length > 2 ? ` e mais ${lowSubjects.length - 2}` : ""}`
      : null
  ].filter(Boolean) as string[];

  return [...new Set(reasons)];
}

async function withAnnouncementAuthors<T extends { authorId: string }>(schoolId: string, announcements: T[]) {
  const authorIds = [...new Set(announcements.map((announcement) => announcement.authorId))];
  if (!authorIds.length) return announcements.map((announcement) => ({ ...announcement, author: null }));

  const authors = await prisma.user.findMany({
    where: { schoolId, id: { in: authorIds } },
    select: { id: true, name: true }
  });
  const authorsById = new Map(authors.map((author) => [author.id, author]));

  return announcements.map((announcement) => ({
    ...announcement,
    author: authorsById.get(announcement.authorId) ?? null
  }));
}

function sortTeacherAssignments<
  T extends {
    subject: { name: string };
    classroom: { gradeLevel: string; name: string; shift: string };
  }
>(assignments: T[]) {
  return [...assignments].sort(
    (first, second) =>
      first.classroom.gradeLevel.localeCompare(second.classroom.gradeLevel, "pt-BR") ||
      first.classroom.name.localeCompare(second.classroom.name, "pt-BR") ||
      first.classroom.shift.localeCompare(second.classroom.shift, "pt-BR") ||
      first.subject.name.localeCompare(second.subject.name, "pt-BR")
  );
}

export async function getAdminDashboard(schoolId: string) {
  const [
    students,
    teachers,
    classrooms,
    activeEnrollments,
    attendances,
    recentEnrollments,
    events,
    announcements,
    classroomSummaries,
    attentionEnrollments
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.classroom.count({ where: { schoolId } }),
    prisma.enrollment.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.attendance.findMany({
      where: { schoolId, enrollment: { status: "ACTIVE" } },
      select: { status: true, enrollmentId: true }
    }),
    prisma.enrollment.findMany({
      where: { schoolId },
      include: { student: true, classroom: true },
      orderBy: { enrolledAt: "desc" },
      take: 6
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      orderBy: [{ startsAt: "asc" }, { startTime: "asc" }],
      take: 5
    }),
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 5
    }),
    prisma.classroom.findMany({
      where: { schoolId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            grades: { select: { average: true, subject: { select: { id: true, name: true } } } },
            attendances: { select: { status: true, subject: { select: { id: true, name: true } } } }
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.enrollment.findMany({
      where: { schoolId, status: "ACTIVE" },
      select: {
        grades: { select: { average: true, subject: { select: { id: true, name: true } } } },
        attendances: { select: { status: true, subject: { select: { id: true, name: true } } } }
      }
    })
  ]);

  const present = attendances.filter((item) => item.status === "PRESENT").length;
  const attendanceAverage = attendances.length ? (present / attendances.length) * 100 : 0;
  const belowExpected = attentionEnrollments.filter(
    (enrollment) => summarizeAttentionEnrollment(enrollment).reasons.length > 0
  ).length;

  return {
    metrics: {
      students,
      teachers,
      classrooms,
      activeEnrollments,
      attendanceAverage,
      belowExpected
    },
    recentEnrollments,
    events,
    announcements,
    classroomSummaries: classroomSummaries.map((classroom) => {
      const gradeValues = classroom.enrollments.flatMap((enrollment) =>
        enrollment.grades.map((grade) => grade.average)
      );
      const attendanceValues = classroom.enrollments.flatMap((enrollment) =>
        enrollment.attendances.map((attendance) => attendance.status)
      );
      const classroomPresence = attendanceValues.length
        ? (attendanceValues.filter((status) => status === "PRESENT").length /
            attendanceValues.length) *
          100
        : 0;

      return {
        id: classroom.id,
        name: classroom.name,
        gradeLevel: classroom.gradeLevel,
        shift: classroom.shift,
        students: classroom.enrollments.length,
        averageGrade: average(gradeValues),
        attendance: classroomPresence
      };
    })
  };
}

export async function listStudents({
  schoolId,
  search,
  classroomId,
  status
}: {
  schoolId: string;
  search?: string;
  classroomId?: string;
  status?: EnrollmentStatus;
}) {
  return prisma.student.findMany({
    where: {
      schoolId,
      fullName: search ? { contains: search, mode: "insensitive" } : undefined,
      enrollments:
        classroomId || status
          ? {
              some: {
                classroomId: classroomId || undefined,
                status: status || undefined
              }
            }
          : undefined
    },
    include: {
      guardians: {
        include: { guardian: true },
        orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }]
      },
      enrollments: {
        include: {
          classroom: true,
          attendances: { select: { status: true } }
        },
        orderBy: { enrolledAt: "desc" },
        take: 1
      }
    },
    orderBy: { fullName: "asc" },
    take: 50
  });
}

export async function listEnrollmentsAdmin({
  schoolId,
  search,
  classroomId,
  status
}: {
  schoolId: string;
  search?: string;
  classroomId?: string;
  status?: EnrollmentStatus;
}) {
  return prisma.enrollment.findMany({
    where: {
      schoolId,
      classroomId: classroomId || undefined,
      status: status || undefined,
      OR: search
        ? [
            { registration: { contains: search, mode: "insensitive" } },
            { student: { fullName: { contains: search, mode: "insensitive" } } }
          ]
        : undefined
    },
    include: {
      student: {
        include: {
          guardians: {
            include: { guardian: true },
            orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }]
          }
        }
      },
      classroom: true,
      academicYear: true
    },
    orderBy: { enrolledAt: "desc" },
    take: 80
  });
}

export async function getStudentDetails(schoolId: string, studentId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      user: true,
      guardians: { include: { guardian: true } },
      enrollments: {
        include: {
          classroom: true,
          academicYear: true,
          grades: {
            include: { subject: true, academicPeriod: true },
            orderBy: [{ subject: { name: "asc" } }, { academicPeriod: { sortOrder: "asc" } }]
          },
          attendances: { include: { subject: true }, orderBy: { date: "desc" } }
        },
        orderBy: { enrolledAt: "desc" }
      }
    }
  });
}

export async function getEnrollmentOptions(schoolId: string) {
  const [guardians, classrooms, academicYears] = await Promise.all([
    prisma.guardian.findMany({ where: { schoolId }, orderBy: { fullName: "asc" } }),
    prisma.classroom.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: { schoolId }, orderBy: { year: "desc" } })
  ]);

  return { guardians, classrooms, academicYears };
}

export async function listGuardians(
  schoolId: string,
  filters: { search?: string; relation?: string } = {}
) {
  return prisma.guardian.findMany({
    where: {
      schoolId,
      fullName: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      relation: filters.relation || undefined
    },
    include: {
      students: {
        include: { student: true },
        orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }]
      }
    },
    orderBy: { fullName: "asc" }
  });
}

export async function listGuardianRelations(schoolId: string) {
  const guardians = await prisma.guardian.findMany({
    where: { schoolId },
    select: { relation: true },
    orderBy: { relation: "asc" }
  });

  return [...new Set(guardians.map((guardian) => guardian.relation).filter(Boolean))];
}

export async function getGuardianDetails(schoolId: string, guardianId: string) {
  return prisma.guardian.findFirst({
    where: { id: guardianId, schoolId },
    include: {
      user: true,
      students: {
        orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }],
        include: {
          student: {
            include: {
              enrollments: {
                include: {
                  classroom: true,
                  academicYear: true
                },
                orderBy: { enrolledAt: "desc" }
              }
            }
          }
        }
      }
    }
  });
}

export async function listTeachers(
  schoolId: string,
  filters: { search?: string; subjectId?: string; status?: UserStatus } = {}
) {
  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      fullName: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      status: filters.status || undefined,
      assignments: filters.subjectId ? { some: { subjectId: filters.subjectId } } : undefined
    },
    include: {
      assignments: {
        include: { subject: true, classroom: { include: { academicYear: true } } }
      }
    },
    orderBy: { fullName: "asc" }
  });

  return teachers.map((teacher) => ({
    ...teacher,
    assignments: sortTeacherAssignments(teacher.assignments)
  }));
}

export async function getTeacherDetails(schoolId: string, teacherId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: {
      user: true,
      assignments: {
        include: { subject: true, classroom: { include: { academicYear: true } } }
      }
    }
  });

  if (!teacher) return null;

  return {
    ...teacher,
    assignments: sortTeacherAssignments(teacher.assignments)
  };
}

export async function getTeacherAssignmentManager(schoolId: string, teacherId: string) {
  const [teacher, activeAcademicYear, subjects] = await Promise.all([
    getTeacherDetails(schoolId, teacherId),
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true }
    }),
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" }
    })
  ]);

  if (!teacher) return null;

  const classrooms = await prisma.classroom.findMany({
    where: {
      schoolId,
      academicYearId: activeAcademicYear?.id
    },
    include: {
      academicYear: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
  });

  return {
    teacher,
    subjects,
    classrooms
  };
}

export async function listClassrooms(schoolId: string) {
  return prisma.classroom.findMany({
    where: { schoolId },
    include: {
      academicYear: true,
      assignments: { include: { teacher: true, subject: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          grades: { select: { average: true } },
          attendances: { select: { status: true } }
        }
      }
    },
    orderBy: [{ academicYear: { year: "desc" } }, { gradeLevel: "asc" }, { name: "asc" }]
  });
}

export async function getClassroomDetails(schoolId: string, classroomId: string) {
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, schoolId },
    include: {
      academicYear: true,
      assignments: {
        include: {
          teacher: true,
          subject: true,
          classroom: true
        }
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: true,
          grades: { include: { subject: true } },
          attendances: { include: { subject: true } }
        },
        orderBy: { student: { fullName: "asc" } }
      }
    }
  });

  if (!classroom) return null;

  return {
    ...classroom,
    assignments: sortTeacherAssignments(classroom.assignments)
  };
}

export async function getClassroomAssignmentManager(schoolId: string, classroomId: string) {
  const [classroom, teachers, subjects] = await Promise.all([
    getClassroomDetails(schoolId, classroomId),
    prisma.teacher.findMany({
      where: { schoolId, status: "ACTIVE" },
      orderBy: { fullName: "asc" }
    }),
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" }
    })
  ]);

  if (!classroom) return null;

  return {
    classroom,
    teachers,
    subjects
  };
}

export async function listSubjects(schoolId: string) {
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    include: { assignments: { include: { teacher: true, subject: true, classroom: true } } },
    orderBy: { name: "asc" }
  });

  return subjects.map((subject) => ({
    ...subject,
    assignments: sortTeacherAssignments(subject.assignments)
  }));
}

export async function getAdminAttentionStudents(schoolId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId, status: "ACTIVE" },
    include: {
      student: true,
      classroom: true,
      grades: { include: { subject: true } },
      attendances: { select: { status: true, subject: { select: { id: true, name: true } } } }
    },
    orderBy: { enrolledAt: "desc" },
    take: 120
  });

  return enrollments
    .map((enrollment) => {
      const { averageGrade, attendanceRate, situation, reasons } = summarizeAttentionEnrollment(enrollment);

      return {
        id: enrollment.id,
        studentId: enrollment.studentId,
        studentName: enrollment.student.fullName,
        registration: enrollment.registration,
        classroomName: enrollment.classroom.name,
        averageGrade,
        attendanceRate,
        situation,
        reasons
      };
    })
    .filter((item) => item.reasons.length > 0)
    .slice(0, 8);
}

export async function getAdminReportOptions(schoolId: string) {
  const [academicYears, classrooms] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId },
      include: { periods: { orderBy: { sortOrder: "asc" } } },
      orderBy: { year: "desc" }
    }),
    prisma.classroom.findMany({
      where: { schoolId },
      include: { academicYear: true },
      orderBy: [{ academicYear: { year: "desc" } }, { gradeLevel: "asc" }, { name: "asc" }]
    })
  ]);

  return { academicYears, classrooms };
}

export async function getAdminReports(
  schoolId: string,
  filters: { academicYearId?: string; classroomId?: string; periodId?: string } = {}
) {
  const options = await getAdminReportOptions(schoolId);
  const selectedAcademicYear =
    options.academicYears.find((year) => year.id === filters.academicYearId) ??
    options.academicYears.find((year) => year.isActive) ??
    options.academicYears[0] ??
    null;
  const selectedClassroom = filters.classroomId
    ? options.classrooms.find(
        (classroom) =>
          classroom.id === filters.classroomId &&
          (!selectedAcademicYear || classroom.academicYearId === selectedAcademicYear.id)
      ) ?? null
    : null;
  const periods = selectedAcademicYear?.periods ?? [];
  const selectedPeriod = filters.periodId
    ? periods.find((period) => period.id === filters.periodId) ?? null
    : null;

  const enrollmentWhere: Prisma.EnrollmentWhereInput = {
    schoolId,
    status: "ACTIVE",
    ...(selectedAcademicYear ? { academicYearId: selectedAcademicYear.id } : {}),
    ...(selectedClassroom ? { classroomId: selectedClassroom.id } : {})
  };
  const gradeWhere: Prisma.GradeWhereInput = {
    schoolId,
    ...(selectedAcademicYear ? { academicPeriod: { academicYearId: selectedAcademicYear.id } } : {}),
    ...(selectedPeriod ? { academicPeriodId: selectedPeriod.id } : {})
  };
  const attendanceWhere: Prisma.AttendanceWhereInput = {
    schoolId,
    ...(selectedPeriod ? { date: { gte: selectedPeriod.startsAt, lte: selectedPeriod.endsAt } } : {})
  };

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: true,
      classroom: { include: { academicYear: true } },
      grades: {
        where: gradeWhere,
        include: { subject: true, academicPeriod: true },
        orderBy: [{ subject: { name: "asc" } }, { academicPeriod: { sortOrder: "asc" } }]
      },
      attendances: {
        where: attendanceWhere,
        select: { status: true, subject: { select: { id: true, name: true } } },
        orderBy: { date: "desc" }
      }
    },
    orderBy: [{ classroom: { gradeLevel: "asc" } }, { classroom: { name: "asc" } }, { student: { fullName: "asc" } }]
  });

  const enrollmentSummaries = enrollments.map((enrollment) => {
    const subjectAverages = subjectAveragesFromGrades(enrollment.grades);
    const averageGrade = getOverallAverageFromSubjects(subjectAverages);
    const attendanceRate = attendanceRateFromStatuses(enrollment.attendances);
    const situation = getAcademicStatusFromSubjects(
      subjectAverages,
      attendanceRate,
      { isFinal: false },
      subjectAttendanceRatesFromAttendances(enrollment.attendances)
    );
    const reasons = attentionReasons({
      averageGrade,
      attendanceRate,
      attendanceTotal: enrollment.attendances.length,
      subjectAverages
    });

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentName: enrollment.student.fullName,
      registration: enrollment.registration,
      classroomId: enrollment.classroomId,
      classroomName: enrollment.classroom.name,
      averageGrade,
      attendanceRate,
      attendanceTotal: enrollment.attendances.length,
      attendancePresent: enrollment.attendances.filter((attendance) => attendance.status === "PRESENT").length,
      situation,
      reasons
    };
  });

  const classroomMap = new Map<
    string,
    {
      id: string;
      name: string;
      gradeLevel: string;
      shift: string;
      students: number;
      averageGrade: number;
      attendance: number;
      attentionCount: number;
    }
  >();

  for (const enrollment of enrollments) {
    if (!classroomMap.has(enrollment.classroomId)) {
      classroomMap.set(enrollment.classroomId, {
        id: enrollment.classroom.id,
        name: enrollment.classroom.name,
        gradeLevel: enrollment.classroom.gradeLevel,
        shift: enrollment.classroom.shift,
        students: 0,
        averageGrade: 0,
        attendance: 0,
        attentionCount: 0
      });
    }
  }

  for (const classroom of classroomMap.values()) {
    const classroomEnrollments = enrollmentSummaries.filter((enrollment) => enrollment.classroomId === classroom.id);
    const attendanceTotal = classroomEnrollments.reduce((sum, enrollment) => sum + enrollment.attendanceTotal, 0);
    const attendancePresent = classroomEnrollments.reduce((sum, enrollment) => sum + enrollment.attendancePresent, 0);
    classroom.students = classroomEnrollments.length;
    classroom.averageGrade = average(classroomEnrollments.map((enrollment) => enrollment.averageGrade));
    classroom.attendance = attendanceTotal ? (attendancePresent / attendanceTotal) * 100 : 0;
    classroom.attentionCount = classroomEnrollments.filter((enrollment) => enrollment.reasons.length > 0).length;
  }

  const attentionStudents = enrollmentSummaries
    .filter((enrollment) => enrollment.reasons.length > 0)
    .sort((first, second) => {
      const firstAttendanceLow =
        first.attendanceTotal > 0 && isAttendanceBelowMinimum(first.attendanceRate) ? 0 : 1;
      const secondAttendanceLow =
        second.attendanceTotal > 0 && isAttendanceBelowMinimum(second.attendanceRate) ? 0 : 1;
      return (
        firstAttendanceLow - secondAttendanceLow ||
        first.studentName.localeCompare(second.studentName, "pt-BR")
      );
    });

  return {
    filters: {
      academicYearId: selectedAcademicYear?.id ?? "",
      classroomId: selectedClassroom?.id ?? "",
      periodId: selectedPeriod?.id ?? ""
    },
    options,
    metrics: {
      activeEnrollments: enrollments.length,
      attendanceAverage: enrollmentSummaries.reduce((sum, enrollment) => sum + enrollment.attendanceTotal, 0)
        ? (enrollmentSummaries.reduce((sum, enrollment) => sum + enrollment.attendancePresent, 0) /
            enrollmentSummaries.reduce((sum, enrollment) => sum + enrollment.attendanceTotal, 0)) *
          100
        : 0,
      attentionStudents: attentionStudents.length
    },
    classroomSummaries: [...classroomMap.values()].sort(
      (first, second) =>
        first.gradeLevel.localeCompare(second.gradeLevel, "pt-BR") ||
        first.name.localeCompare(second.name, "pt-BR")
    ),
    attentionStudents,
    hasData: enrollments.length > 0
  };
}

export async function listAnnouncementsAdmin(schoolId: string) {
  const announcements = await prisma.announcement.findMany({
    where: { schoolId },
    include: { classroom: true },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }]
  });
  return withAnnouncementAuthors(schoolId, announcements);
}

export async function listTeacherAnnouncements(schoolId: string, userId: string) {
  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId, userId },
    select: {
      assignments: {
        select: {
          classroomId: true
        }
      }
    }
  });

  const classroomIds = [...new Set(teacher.assignments.map((assignment) => assignment.classroomId))];

  const announcements = await prisma.announcement.findMany({
    where: teacherAnnouncementWhere(schoolId, classroomIds),
    include: { classroom: true },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }]
  });
  return withAnnouncementAuthors(schoolId, announcements);
}

export async function listCalendarAdmin(schoolId: string) {
  return prisma.calendarEvent.findMany({
    where: { schoolId },
    include: { academicYear: true },
    orderBy: [{ startsAt: "asc" }, { startTime: "asc" }]
  });
}

export async function getSchoolSettings(schoolId: string) {
  const [school, academicYears, periods, auditLogs] = await Promise.all([
    prisma.school.findFirstOrThrow({ where: { id: schoolId } }),
    prisma.academicYear.findMany({
      where: { schoolId },
      include: { periods: { select: { closedAt: true } } },
      orderBy: { year: "desc" }
    }),
    prisma.academicPeriod.findMany({
      where: { schoolId },
      include: { academicYear: true },
      orderBy: [{ academicYear: { year: "desc" } }, { sortOrder: "asc" }]
    }),
    prisma.auditLog.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return { school, academicYears, periods, auditLogs };
}

export async function getActiveAcademicYearLabel(schoolId: string) {
  const activeAcademicYear = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { year: true },
    orderBy: { year: "desc" }
  });

  return activeAcademicYear?.year ?? schoolConfig.academic.academicYear;
}

export async function getProfessorDashboard(schoolId: string, userId: string) {
  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      assignments: {
        include: {
          subject: true,
          classroom: {
            include: { _count: { select: { enrollments: true } } }
          }
        }
      }
    }
  });

  const [announcementRows, events] = await Promise.all([
    prisma.announcement.findMany({
      where: teacherAnnouncementWhere(schoolId, teacher.assignments.map((assignment) => assignment.classroomId)),
      include: { classroom: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 5
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      orderBy: [{ startsAt: "asc" }, { startTime: "asc" }],
      take: 4
    })
  ]);
  const announcements = await withAnnouncementAuthors(schoolId, announcementRows);

  const classroomMap = new Map(
    teacher.assignments.map((assignment) => [assignment.classroom.id, assignment.classroom])
  );
  const subjects = [...new Set(teacher.assignments.map((assignment) => assignment.subject.name))];

  return {
    teacher,
    classrooms: [...classroomMap.values()],
    subjects,
    announcements,
    events,
    pendingActivities: teacher.assignments.length,
    todayClasses: teacher.assignments.slice(0, 4)
  };
}

export async function getTeacherHome(schoolId: string, userId: string) {
  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      assignments: {
        include: {
          subject: true,
          classroom: {
            include: {
              academicYear: true,
              enrollments: {
                where: { status: "ACTIVE" },
                select: { id: true }
              },
              _count: { select: { enrollments: true } }
            }
          }
        },
        orderBy: [{ classroom: { name: "asc" } }, { subject: { name: "asc" } }]
      }
    }
  });

  const academicYearIds = [...new Set(teacher.assignments.map((assignment) => assignment.classroom.academicYearId))];
  const now = new Date();
  const [announcementRows, events, startedPeriods] = await Promise.all([
    prisma.announcement.findMany({
      where: teacherAnnouncementWhere(schoolId, teacher.assignments.map((assignment) => assignment.classroomId)),
      include: { classroom: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 5
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      include: { academicYear: true },
      orderBy: [{ startsAt: "asc" }, { startTime: "asc" }],
      take: 4
    }),
    prisma.academicPeriod.findMany({
      where: {
        schoolId,
        academicYearId: { in: academicYearIds },
        startsAt: { lte: now }
      },
      orderBy: [{ academicYearId: "asc" }, { sortOrder: "asc" }]
    })
  ]);
  const announcements = await withAnnouncementAuthors(schoolId, announcementRows);

  const classMap = new Map<
    string,
    {
      id: string;
      name: string;
      shift: string;
      gradeLevel: string;
      academicYear: number;
      students: number;
      subjects: Array<{ id: string; name: string }>;
    }
  >();

  for (const assignment of teacher.assignments) {
    const current = classMap.get(assignment.classroomId) ?? {
      id: assignment.classroom.id,
      name: assignment.classroom.name,
      shift: assignment.classroom.shift,
      gradeLevel: assignment.classroom.gradeLevel,
      academicYear: assignment.classroom.academicYear.year,
      students: assignment.classroom._count.enrollments,
      subjects: []
    };
    current.subjects.push({ id: assignment.subject.id, name: assignment.subject.name });
    classMap.set(assignment.classroomId, current);
  }

  const classrooms = [...classMap.values()];
  const subjects = [...new Set(teacher.assignments.map((assignment) => assignment.subject.name))];
  const todayClasses = teacher.assignments.slice(0, 4).map((assignment, index) => ({
    id: assignment.id,
    classroomId: assignment.classroomId,
    classroomName: assignment.classroom.name,
    subjectId: assignment.subjectId,
    subjectName: assignment.subject.name,
    students: assignment.classroom._count.enrollments,
    index
  }));

  const periodsByAcademicYear = new Map<string, typeof startedPeriods>();
  for (const period of startedPeriods) {
    const current = periodsByAcademicYear.get(period.academicYearId) ?? [];
    current.push(period);
    periodsByAcademicYear.set(period.academicYearId, current);
  }

  const pendingItems: Array<{
    type: "grade" | "attendance";
    href: string;
    missing: number;
    total: number;
  }> = [];

  for (const assignment of teacher.assignments) {
    const enrollmentIds = assignment.classroom.enrollments.map((enrollment) => enrollment.id);
    const periods = periodsByAcademicYear.get(assignment.classroom.academicYearId) ?? [];
    if (!enrollmentIds.length || !periods.length) continue;

    const gradesByPeriod = await prisma.grade.groupBy({
      by: ["academicPeriodId"],
      where: {
        schoolId,
        subjectId: assignment.subjectId,
        academicPeriodId: { in: periods.map((period) => period.id) },
        enrollmentId: { in: enrollmentIds }
      },
      _count: { _all: true }
    });

    const gradeCountByPeriod = new Map(
      gradesByPeriod.map((group) => [group.academicPeriodId, group._count._all])
    );

    for (const period of periods) {
      const missingGrades = Math.max(0, enrollmentIds.length - (gradeCountByPeriod.get(period.id) ?? 0));
      if (missingGrades > 0) {
        pendingItems.push({
          type: "grade",
          href: `/professor/turmas/${assignment.classroomId}?tab=notas&subjectId=${assignment.subjectId}&periodId=${period.id}`,
          missing: missingGrades,
          total: enrollmentIds.length
        });
      }
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  for (const lesson of todayClasses) {
    const assignment = teacher.assignments.find((item) => item.id === lesson.id);
    if (!assignment) continue;
    const enrollmentIds = assignment.classroom.enrollments.map((enrollment) => enrollment.id);
    if (!enrollmentIds.length) continue;

    const attendanceCount = await prisma.attendance.count({
      where: {
        schoolId,
        classroomId: assignment.classroomId,
        subjectId: assignment.subjectId,
        enrollmentId: { in: enrollmentIds },
        date: { gte: todayStart, lt: tomorrowStart }
      }
    });
    const missingAttendances = Math.max(0, enrollmentIds.length - attendanceCount);

    if (missingAttendances > 0) {
      const date = todayStart.toISOString().slice(0, 10);
      pendingItems.push({
        type: "attendance",
        href: `/professor/turmas/${assignment.classroomId}?tab=frequencia&freqView=registrar&subjectId=${assignment.subjectId}&data=${date}`,
        missing: missingAttendances,
        total: enrollmentIds.length
      });
    }
  }

  const gradeTasks = pendingItems.filter((item) => item.type === "grade").length;
  const attendanceTasks = pendingItems.filter((item) => item.type === "attendance").length;
  const pendingActivities = pendingItems.length;
  const pendingHref = pendingItems[0]?.href ?? null;
  const pendingParts = [
    gradeTasks ? `${gradeTasks} ${gradeTasks === 1 ? "lançamento de notas" : "lançamentos de notas"}` : null,
    attendanceTasks ? `${attendanceTasks} ${attendanceTasks === 1 ? "chamada" : "chamadas"}` : null
  ].filter(Boolean);

  return {
    teacher,
    classrooms,
    subjects,
    announcements,
    events,
    pendingActivities,
    pendingDetail: pendingParts.length ? pendingParts.join(" · ") : "Tudo em dia",
    pendingSummary: {
      totalTasks: pendingActivities,
      gradeTasks,
      attendanceTasks,
      items: pendingItems
    },
    pendingHref,
    todayClasses
  };
}

export async function getTeacherClassrooms(schoolId: string, userId: string) {
  const home = await getTeacherHome(schoolId, userId);
  return home.classrooms;
}

export async function getProfessorClassroom(
  schoolId: string,
  userId: string,
  classroomId: string,
  subjectId?: string
) {
  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId, userId }
  });

  const assignments = await prisma.teacherSubject.findMany({
    where: { schoolId, teacherId: teacher.id, classroomId },
    include: { subject: true, classroom: true }
  });

  if (!assignments.length) return null;

  const activeSubjectId = subjectId ?? assignments[0].subjectId;
  const ownsSubject = assignments.some((assignment) => assignment.subjectId === activeSubjectId);
  if (!ownsSubject) return null;
  const classroomAcademicYearId = assignments[0].classroom.academicYearId;

  const [classroom, periods] = await Promise.all([
    prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: true,
            grades: {
              where: { subjectId: activeSubjectId },
              include: { academicPeriod: true }
            },
            attendances: {
              where: { subjectId: activeSubjectId },
              orderBy: { date: "desc" },
              take: 1
            }
          },
          orderBy: { student: { fullName: "asc" } }
        }
      }
    }),
    prisma.academicPeriod.findMany({
      where: { schoolId, academicYearId: classroomAcademicYearId },
      orderBy: { sortOrder: "asc" }
    })
  ]);

  return {
    teacher,
    assignments,
    classroom,
    periods,
    activeSubjectId
  };
}

export async function getTeacherClassroomWorkspace(
  schoolId: string,
  userId: string,
  classroomId: string,
  subjectId?: string
) {
  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId, userId }
  });

  const assignments = await prisma.teacherSubject.findMany({
    where: { schoolId, teacherId: teacher.id, classroomId },
    include: {
      subject: true,
      classroom: {
        include: { academicYear: true }
      }
    },
    orderBy: { subject: { name: "asc" } }
  });

  if (!assignments.length) return null;

  const allowedSubjectIds = assignments.map((assignment) => assignment.subjectId);
  const activeSubjectId =
    subjectId && allowedSubjectIds.includes(subjectId) ? subjectId : assignments[0].subjectId;
  const classroomAcademicYearId = assignments[0].classroom.academicYearId;

  const [classroom, periods] = await Promise.all([
    prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        academicYear: true,
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: true,
            grades: {
              where: { subjectId: { in: allowedSubjectIds } },
              include: { subject: true, academicPeriod: true },
              orderBy: [{ subject: { name: "asc" } }, { academicPeriod: { sortOrder: "asc" } }]
            },
            attendances: {
              where: { subjectId: { in: allowedSubjectIds } },
              include: { subject: true },
              orderBy: { date: "desc" }
            }
          },
          orderBy: { student: { fullName: "asc" } }
        }
      }
    }),
    prisma.academicPeriod.findMany({
      where: { schoolId, academicYearId: classroomAcademicYearId },
      orderBy: { sortOrder: "asc" }
    })
  ]);

  if (!classroom) return null;

  return {
    teacher,
    assignments,
    classroom,
    periods,
    activeSubjectId
  };
}

export async function getStudentPortal(schoolId: string, userId: string) {
  const student = await prisma.student.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      guardians: { include: { guardian: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          academicYear: true,
          classroom: { include: { academicYear: true } },
          grades: {
            include: { subject: true, academicPeriod: { include: { academicYear: true } } },
            orderBy: [{ academicPeriod: { sortOrder: "asc" } }, { subject: { name: "asc" } }]
          },
          attendances: { include: { subject: true }, orderBy: { date: "desc" } }
        },
        take: 1
      }
    }
  });

  const enrollment = student.enrollments[0] ?? null;
  const announcementWhere = studentAnnouncementWhere(schoolId, enrollment?.classroomId);

  const [announcementRows, events] = await Promise.all([
    prisma.announcement.findMany({
      where: announcementWhere,
      include: { classroom: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 20
    }),
    prisma.calendarEvent.findMany({
      where: {
        schoolId,
        ...(enrollment ? { academicYearId: enrollment.academicYearId } : {}),
        startsAt: { gte: academicTimelineStart() }
      },
      include: { academicYear: true },
      orderBy: [{ startsAt: "asc" }, { startTime: "asc" }],
      take: 30
    })
  ]);
  const announcements = await withAnnouncementAuthors(schoolId, announcementRows);

  return { student, enrollment, announcements, events };
}

export async function getGuardianPortal(
  schoolId: string,
  userId: string,
  selectedStudentId?: string
) {
  const guardian = await prisma.guardian.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      students: {
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: {
                  academicYear: true,
                  classroom: { include: { academicYear: true } },
                  grades: {
                    include: { subject: true, academicPeriod: { include: { academicYear: true } } },
                    orderBy: [{ academicPeriod: { sortOrder: "asc" } }, { subject: { name: "asc" } }]
                  },
                  attendances: { include: { subject: true }, orderBy: { date: "desc" } }
                },
                take: 1
              }
            }
          }
        }
      }
    }
  });

  const children = guardian.students.map((item) => item.student);
  const selected =
    children.find((student) => student.id === selectedStudentId) ?? children[0] ?? null;
  const enrollment = selected?.enrollments[0] ?? null;
  const announcementWhere = guardianAnnouncementWhere(schoolId, enrollment?.classroomId);

  const [announcementRows, events] = await Promise.all([
    prisma.announcement.findMany({
      where: announcementWhere,
      include: { classroom: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 20
    }),
    prisma.calendarEvent.findMany({
      where: {
        schoolId,
        ...(enrollment ? { academicYearId: enrollment.academicYearId } : {}),
        startsAt: { gte: academicTimelineStart() }
      },
      include: { academicYear: true },
      orderBy: [{ startsAt: "asc" }, { startTime: "asc" }],
      take: 30
    })
  ]);
  const announcements = await withAnnouncementAuthors(schoolId, announcementRows);

  return {
    guardian,
    children,
    selectedStudent: selected,
    enrollment,
    announcements,
    events
  };
}

export function summarizeEnrollment(
  enrollment: {
    grades: Array<{ average: number; subject: { name: string } }>;
    attendances: Array<{ status: AttendanceStatus; subject?: { name: string } }>;
  } | null,
  options: { isFinal?: boolean } = {}
) {
  if (!enrollment) {
    return {
      averageGrade: 0,
      attendanceRate: 0,
      absences: 0,
      situation: "Cursando",
      subjectAverages: [] as Array<{ subject: string; average: number }>
    };
  }

  const subjectAverages = subjectAveragesFromGrades(enrollment.grades);
  const averageGrade = getOverallAverageFromSubjects(subjectAverages);
  const attendanceRate = enrollment.attendances.length
    ? (enrollment.attendances.filter((attendance) => attendance.status === "PRESENT").length /
        enrollment.attendances.length) *
      100
    : 0;
  const absences = enrollment.attendances.filter((attendance) => attendance.status === "ABSENT")
    .length;

  return {
    averageGrade,
    attendanceRate,
    absences,
    situation: getAcademicStatusFromSubjects(
      subjectAverages,
      attendanceRate,
      options,
      subjectAttendanceRatesFromAttendances(enrollment.attendances)
    ),
    subjectAverages
  };
}
