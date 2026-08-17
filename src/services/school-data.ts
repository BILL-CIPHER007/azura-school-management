import type { AnnouncementAudience, AttendanceStatus, EnrollmentStatus } from "@prisma/client";
import { schoolConfig } from "@/config/school";
import { isAttendanceBelowMinimum } from "@/lib/academic-rules";
import { prisma } from "@/lib/prisma";
import { average, gradeSituation } from "@/lib/utils";

function academicTimelineStart() {
  return new Date(`${schoolConfig.academic.academicYear}-08-01`);
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
    classroomSummaries
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.classroom.count({ where: { schoolId } }),
    prisma.enrollment.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.attendance.findMany({ where: { schoolId }, select: { status: true, enrollmentId: true } }),
    prisma.enrollment.findMany({
      where: { schoolId },
      include: { student: true, classroom: true },
      orderBy: { enrolledAt: "desc" },
      take: 6
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { publishedAt: "desc" },
      take: 5
    }),
    prisma.classroom.findMany({
      where: { schoolId },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            grades: { select: { average: true } },
            attendances: { select: { status: true } }
          }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  const present = attendances.filter((item) => item.status === "PRESENT").length;
  const attendanceAverage = attendances.length ? (present / attendances.length) * 100 : 0;
  const byEnrollment = new Map<string, { total: number; present: number }>();
  for (const attendance of attendances) {
    const current = byEnrollment.get(attendance.enrollmentId) ?? { total: 0, present: 0 };
    current.total += 1;
    if (attendance.status === "PRESENT") current.present += 1;
    byEnrollment.set(attendance.enrollmentId, current);
  }

  const belowExpected = [...byEnrollment.values()].filter(
    (item) => item.total > 0 && isAttendanceBelowMinimum((item.present / item.total) * 100)
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
        students: classroom._count.enrollments,
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
      guardians: { include: { guardian: true } },
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

export async function listGuardians(schoolId: string) {
  return prisma.guardian.findMany({
    where: { schoolId },
    include: { students: { include: { student: true } } },
    orderBy: { fullName: "asc" }
  });
}

export async function listTeachers(schoolId: string) {
  return prisma.teacher.findMany({
    where: { schoolId },
    include: {
      assignments: {
        include: { subject: true, classroom: true }
      }
    },
    orderBy: { fullName: "asc" }
  });
}

export async function getTeacherDetails(schoolId: string, teacherId: string) {
  return prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: {
      user: true,
      assignments: {
        include: { subject: true, classroom: true },
        orderBy: [{ classroom: { name: "asc" } }, { subject: { name: "asc" } }]
      }
    }
  });
}

export async function listClassrooms(schoolId: string) {
  return prisma.classroom.findMany({
    where: { schoolId },
    include: {
      academicYear: true,
      _count: { select: { enrollments: true } },
      assignments: { include: { teacher: true, subject: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          grades: { select: { average: true } },
          attendances: { select: { status: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function getClassroomDetails(schoolId: string, classroomId: string) {
  return prisma.classroom.findFirst({
    where: { id: classroomId, schoolId },
    include: {
      academicYear: true,
      assignments: { include: { teacher: true, subject: true } },
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
}

export async function listSubjects(schoolId: string) {
  return prisma.subject.findMany({
    where: { schoolId },
    include: { assignments: { include: { teacher: true, classroom: true } } },
    orderBy: { name: "asc" }
  });
}

export async function listAnnouncementsAdmin(schoolId: string) {
  return prisma.announcement.findMany({
    where: { schoolId },
    include: { classroom: true },
    orderBy: { publishedAt: "desc" }
  });
}

export async function listCalendarAdmin(schoolId: string) {
  return prisma.calendarEvent.findMany({
    where: { schoolId },
    include: { academicYear: true },
    orderBy: { startsAt: "asc" }
  });
}

export async function getSchoolSettings(schoolId: string) {
  const [school, academicYears, periods, auditLogs] = await Promise.all([
    prisma.school.findFirstOrThrow({ where: { id: schoolId } }),
    prisma.academicYear.findMany({ where: { schoolId }, orderBy: { year: "desc" } }),
    prisma.academicPeriod.findMany({
      where: { schoolId },
      include: { academicYear: true },
      orderBy: [{ academicYear: { year: "desc" } }, { sortOrder: "asc" }]
    }),
    prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return { school, academicYears, periods, auditLogs };
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

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId, audience: { in: ["SCHOOL", "PROFESSORS"] } },
      orderBy: { publishedAt: "desc" },
      take: 5
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      orderBy: { startsAt: "asc" },
      take: 4
    })
  ]);

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
              _count: { select: { enrollments: true } }
            }
          }
        },
        orderBy: [{ classroom: { name: "asc" } }, { subject: { name: "asc" } }]
      }
    }
  });

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId, audience: { in: ["SCHOOL", "PROFESSORS"] } },
      include: { classroom: true },
      orderBy: { publishedAt: "desc" },
      take: 5
    }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startsAt: { gte: academicTimelineStart() } },
      include: { academicYear: true },
      orderBy: { startsAt: "asc" },
      take: 4
    })
  ]);

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

  return {
    teacher,
    classrooms,
    subjects,
    announcements,
    events,
    pendingActivities: teacher.assignments.length,
    todayClasses: teacher.assignments.slice(0, 4).map((assignment, index) => ({
      id: assignment.id,
      classroomId: assignment.classroomId,
      classroomName: assignment.classroom.name,
      subjectName: assignment.subject.name,
      students: assignment.classroom._count.enrollments,
      index
    }))
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
      where: { schoolId },
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
      where: { schoolId },
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
  const studentAudiences: AnnouncementAudience[] = ["SCHOOL", "STUDENTS"];
  const announcementWhere = enrollment?.classroomId
    ? {
        OR: [
          { audience: { in: studentAudiences } },
          { audience: "CLASSROOM" as const, classroomId: enrollment.classroomId }
        ]
      }
    : { audience: { in: studentAudiences } };

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId, ...announcementWhere },
      include: { classroom: true },
      orderBy: { publishedAt: "desc" },
      take: 20
    }),
    prisma.calendarEvent.findMany({
      where: {
        schoolId,
        ...(enrollment ? { academicYearId: enrollment.academicYearId } : {}),
        startsAt: { gte: academicTimelineStart() }
      },
      include: { academicYear: true },
      orderBy: { startsAt: "asc" },
      take: 30
    })
  ]);

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
  const guardianAudiences: AnnouncementAudience[] = ["SCHOOL", "GUARDIANS"];
  const announcementWhere = enrollment?.classroomId
    ? {
        OR: [
          { audience: { in: guardianAudiences } },
          { audience: "CLASSROOM" as const, classroomId: enrollment.classroomId }
        ]
      }
    : { audience: { in: guardianAudiences } };

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId, ...announcementWhere },
      include: { classroom: true },
      orderBy: { publishedAt: "desc" },
      take: 20
    }),
    prisma.calendarEvent.findMany({
      where: {
        schoolId,
        ...(enrollment ? { academicYearId: enrollment.academicYearId } : {}),
        startsAt: { gte: academicTimelineStart() }
      },
      include: { academicYear: true },
      orderBy: { startsAt: "asc" },
      take: 30
    })
  ]);

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
  } | null
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

  const averageGrade = average(enrollment.grades.map((grade) => grade.average));
  const attendanceRate = enrollment.attendances.length
    ? (enrollment.attendances.filter((attendance) => attendance.status === "PRESENT").length /
        enrollment.attendances.length) *
      100
    : 0;
  const absences = enrollment.attendances.filter((attendance) => attendance.status === "ABSENT")
    .length;

  const grouped = new Map<string, number[]>();
  for (const grade of enrollment.grades) {
    const current = grouped.get(grade.subject.name) ?? [];
    current.push(grade.average);
    grouped.set(grade.subject.name, current);
  }

  return {
    averageGrade,
    attendanceRate,
    absences,
    situation: gradeSituation(averageGrade, attendanceRate),
    subjectAverages: [...grouped.entries()].map(([subject, values]) => ({
      subject,
      average: average(values)
    }))
  };
}
