"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDemoPassword, schoolConfig } from "@/config/school";
import { announcementCanUseClassroom, announcementRequiresClassroom } from "@/lib/announcements";
import { findAcademicPeriodForDate, isAcademicPeriodClosed } from "@/lib/academic-closing";
import { calendarDateFromInput, calendarDateTimeFromInput } from "@/lib/calendar-events";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const gradeValue = z.coerce.number().min(0).max(10);

const enrollmentSchema = z.object({
  studentName: z.string().min(3),
  studentCpf: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  studentPhone: z.string().optional(),
  studentEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  existingGuardianId: z.string().optional(),
  guardianName: z.string().optional(),
  guardianCpf: z.string().optional(),
  relation: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  academicYearId: z.string().min(1),
  classroomId: z.string().min(1),
  enrolledAt: z.string().min(1)
});

const guardianSchema = z.object({
  guardianName: z.string().min(3),
  guardianCpf: z.string().optional(),
  relation: z.string().min(2),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal(""))
});

const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1),
  classroomId: z.string().min(1),
  subjectId: z.string().min(1),
  returnTo: z.string().optional()
});

const subjectSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(8)
});

const announcementSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  audience: z.enum(["SCHOOL", "PROFESSORS", "STUDENTS", "GUARDIANS", "CLASSROOM"]),
  classroomId: z.string().trim().optional()
});

function optionalDate(value?: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function assignmentReturnPath(value: string | undefined, fallback: string) {
  return value?.startsWith("/admin/") ? value : fallback;
}

function redirectWithStatus(path: string, params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`${path}?${search.toString()}`);
}

function revalidateAssignmentAdminPaths(teacherId: string, classroomId: string) {
  revalidatePath("/admin/professores");
  revalidatePath(`/admin/professores/${teacherId}`);
  revalidatePath(`/admin/professores/${teacherId}/atribuicoes`);
  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${classroomId}`);
  revalidatePath(`/admin/turmas/${classroomId}/atribuicoes`);
  revalidatePath("/admin/disciplinas");
}

async function countPeriodMissingGradeTasks({
  schoolId,
  academicYearId,
  periodId
}: {
  schoolId: string;
  academicYearId: string;
  periodId: string;
}) {
  const assignments = await prisma.teacherSubject.findMany({
    where: {
      schoolId,
      classroom: { academicYearId }
    },
    select: {
      classroomId: true,
      subjectId: true,
      classroom: {
        select: {
          enrollments: {
            where: { status: "ACTIVE" },
            select: { id: true }
          }
        }
      }
    }
  });

  let missingTasks = 0;

  for (const assignment of assignments) {
    const enrollmentIds = assignment.classroom.enrollments.map((enrollment) => enrollment.id);
    if (!enrollmentIds.length) continue;

    const gradeCount = await prisma.grade.count({
      where: {
        schoolId,
        subjectId: assignment.subjectId,
        academicPeriodId: periodId,
        enrollmentId: { in: enrollmentIds }
      }
    });

    if (gradeCount < enrollmentIds.length) {
      missingTasks += 1;
    }
  }

  return missingTasks;
}

export async function closeAcademicPeriod(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const periodId = z.string().min(1).parse(formData.get("periodId"));

  const period = await prisma.academicPeriod.findFirstOrThrow({
    where: { id: periodId, schoolId: session.schoolId },
    include: { academicYear: true }
  });

  if (period.closedAt) {
    redirectWithStatus("/admin/configuracoes", { sucesso: "periodo-ja-encerrado" });
  }

  if (period.academicYear.closedAt) {
    redirectWithStatus("/admin/configuracoes", { erro: "ano-encerrado" });
  }

  const missingGradeTasks = await countPeriodMissingGradeTasks({
    schoolId: session.schoolId,
    academicYearId: period.academicYearId,
    periodId: period.id
  });

  if (missingGradeTasks > 0) {
    redirectWithStatus("/admin/configuracoes", {
      erro: "pendencias-periodo",
      periodo: period.name,
      total: String(missingGradeTasks)
    });
  }

  await prisma.academicPeriod.update({
    where: { id: period.id },
    data: { closedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "academic_period.closed",
      entity: "AcademicPeriod",
      entityId: period.id
    }
  });

  revalidatePath("/admin/configuracoes");
  redirectWithStatus("/admin/configuracoes", { sucesso: "periodo-encerrado" });
}

export async function reopenAcademicPeriod(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const periodId = z.string().min(1).parse(formData.get("periodId"));

  const period = await prisma.academicPeriod.findFirstOrThrow({
    where: { id: periodId, schoolId: session.schoolId },
    include: { academicYear: true }
  });

  if (period.academicYear.closedAt) {
    redirectWithStatus("/admin/configuracoes", { erro: "ano-encerrado" });
  }

  await prisma.academicPeriod.update({
    where: { id: period.id },
    data: { closedAt: null }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "academic_period.reopened",
      entity: "AcademicPeriod",
      entityId: period.id
    }
  });

  revalidatePath("/admin/configuracoes");
  redirectWithStatus("/admin/configuracoes", { sucesso: "periodo-reaberto" });
}

export async function closeAcademicYear(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const academicYearId = z.string().min(1).parse(formData.get("academicYearId"));

  const academicYear = await prisma.academicYear.findFirstOrThrow({
    where: { id: academicYearId, schoolId: session.schoolId },
    include: { periods: true }
  });

  if (academicYear.closedAt) {
    redirectWithStatus("/admin/configuracoes", { sucesso: "ano-ja-encerrado" });
  }

  const openPeriods = academicYear.periods.filter((period) => !period.closedAt);
  if (openPeriods.length > 0) {
    redirectWithStatus("/admin/configuracoes", { erro: "periodos-abertos", total: String(openPeriods.length) });
  }

  await prisma.academicYear.update({
    where: { id: academicYear.id },
    data: {
      closedAt: new Date(),
      isActive: false
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "academic_year.closed",
      entity: "AcademicYear",
      entityId: academicYear.id
    }
  });

  revalidatePath("/admin/configuracoes");
  redirectWithStatus("/admin/configuracoes", { sucesso: "ano-encerrado" });
}

export async function createEnrollment(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = enrollmentSchema.parse(Object.fromEntries(formData));
  const studentCpf = optionalText(parsed.studentCpf);
  const studentEmail = optionalText(parsed.studentEmail)?.toLowerCase();
  const guardianCpf = optionalText(parsed.guardianCpf);
  const guardianEmail = optionalText(parsed.guardianEmail)?.toLowerCase();
  const guardianName = optionalText(parsed.guardianName);
  const relation = optionalText(parsed.relation) ?? "Responsável";

  const classroom = await prisma.classroom.findFirstOrThrow({
    where: { id: parsed.classroomId, schoolId: session.schoolId }
  });
  const academicYear = await prisma.academicYear.findFirstOrThrow({
    where: { id: parsed.academicYearId, schoolId: session.schoolId }
  });

  if (classroom.academicYearId !== academicYear.id) {
    redirectWithStatus("/admin/matriculas/nova", { erro: "turma-ano" });
  }

  const studentLookup = [
    studentCpf ? { cpf: studentCpf } : null,
    studentEmail ? { email: studentEmail } : null
  ].filter(Boolean) as Array<{ cpf: string } | { email: string }>;

  if (studentLookup.length) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        schoolId: session.schoolId,
        OR: studentLookup
      },
      select: {
        id: true,
        enrollments: {
          where: {
            academicYearId: academicYear.id,
            status: "ACTIVE"
          },
          select: { id: true },
          take: 1
        }
      }
    });

    if (existingStudent?.enrollments.length) {
      redirectWithStatus("/admin/matriculas/nova", { erro: "matricula-ativa" });
    }

    if (existingStudent) {
      redirectWithStatus("/admin/matriculas/nova", { erro: "aluno-existente" });
    }
  }

  if (studentEmail) {
    const existingUser = await prisma.user.findFirst({
      where: { schoolId: session.schoolId, email: studentEmail },
      select: { id: true }
    });
    if (existingUser) redirectWithStatus("/admin/matriculas/nova", { erro: "email-aluno" });
  }

  const passwordHash = await bcrypt.hash(getDemoPassword(), 10);
  const safeEmail =
    studentEmail ||
    `aluno.${Date.now()}@${schoolConfig.demo.emailDomain}`.toLowerCase();

  const result = await prisma.$transaction(async (tx) => {
    const studentUser = await tx.user.create({
      data: {
        schoolId: session.schoolId,
        name: parsed.studentName,
        email: safeEmail,
        passwordHash,
        role: "ALUNO"
      }
    });

    const student = await tx.student.create({
      data: {
        schoolId: session.schoolId,
        userId: studentUser.id,
        fullName: parsed.studentName,
        cpf: studentCpf,
        birthDate: optionalDate(parsed.birthDate),
        gender: optionalText(parsed.gender),
        phone: optionalText(parsed.studentPhone),
        email: safeEmail,
        address: optionalText(parsed.address)
      }
    });

    let guardianId = parsed.existingGuardianId || "";
    if (guardianId) {
      await tx.guardian.findFirstOrThrow({
        where: { id: guardianId, schoolId: session.schoolId }
      });
    } else {
      const guardianLookup = [
        guardianCpf ? { cpf: guardianCpf } : null,
        guardianEmail ? { email: guardianEmail } : null
      ].filter(Boolean) as Array<{ cpf: string } | { email: string }>;
      const existingGuardian = guardianLookup.length
        ? await tx.guardian.findFirst({
            where: {
              schoolId: session.schoolId,
              OR: guardianLookup
            },
            select: { id: true }
          })
        : null;

      if (existingGuardian) {
        guardianId = existingGuardian.id;
      } else {
        if (!guardianName) {
          throw new Error("Informe o responsável ou selecione um responsável existente.");
        }

        const safeGuardianEmail =
          guardianEmail ||
          `responsavel.${Date.now()}@${schoolConfig.demo.emailDomain}`.toLowerCase();
        const guardianUser = await tx.user.create({
          data: {
            schoolId: session.schoolId,
            name: guardianName,
            email: safeGuardianEmail,
            passwordHash,
            role: "RESPONSAVEL"
          }
        });
        const guardian = await tx.guardian.create({
          data: {
            schoolId: session.schoolId,
            userId: guardianUser.id,
            fullName: guardianName,
            cpf: guardianCpf,
            relation,
            phone: optionalText(parsed.guardianPhone),
            email: safeGuardianEmail
          }
        });
        guardianId = guardian.id;
      }
    }

    await tx.guardianStudent.upsert({
      where: {
        guardianId_studentId: {
          guardianId,
          studentId: student.id
        }
      },
      create: {
        guardianId,
        studentId: student.id,
        isPrimary: true
      },
      update: { isPrimary: true }
    });

    const enrollment = await tx.enrollment.create({
      data: {
        schoolId: session.schoolId,
        studentId: student.id,
        classroomId: classroom.id,
        academicYearId: academicYear.id,
        registration: `${academicYear.year}${Date.now().toString().slice(-5)}`,
        enrolledAt: new Date(`${parsed.enrolledAt}T12:00:00.000Z`),
        status: "ACTIVE"
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId: session.schoolId,
        userId: session.id,
        action: "enrollment.created",
        entity: "Enrollment",
        entityId: enrollment.id
      }
    });

    return { studentId: student.id };
  });

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/alunos/${result.studentId}?sucesso=matricula`);
}

export async function createGuardian(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = guardianSchema.parse(Object.fromEntries(formData));
  const guardianName = optionalText(parsed.guardianName) ?? "";
  const guardianCpf = optionalText(parsed.guardianCpf);
  const guardianEmail = optionalText(parsed.guardianEmail)?.toLowerCase();
  const guardianLookup = [
    guardianCpf ? { cpf: guardianCpf } : null,
    guardianEmail ? { email: guardianEmail } : null
  ].filter(Boolean) as Array<{ cpf: string } | { email: string }>;

  const existingGuardian = guardianLookup.length
    ? await prisma.guardian.findFirst({
        where: {
          schoolId: session.schoolId,
          OR: guardianLookup
        },
        select: { id: true }
      })
    : null;

  if (existingGuardian) {
    redirect(`/admin/responsaveis/${existingGuardian.id}?existente=1`);
  }

  const passwordHash = await bcrypt.hash(getDemoPassword(), 10);
  const safeGuardianEmail =
    guardianEmail ||
    `responsavel.${Date.now()}@${schoolConfig.demo.emailDomain}`.toLowerCase();

  const result = await prisma.$transaction(async (tx) => {
    const guardianUser = await tx.user.create({
      data: {
        schoolId: session.schoolId,
        name: guardianName,
        email: safeGuardianEmail,
        passwordHash,
        role: "RESPONSAVEL"
      }
    });

    const guardian = await tx.guardian.create({
      data: {
        schoolId: session.schoolId,
        userId: guardianUser.id,
        fullName: guardianName,
        cpf: guardianCpf,
        relation: parsed.relation,
        phone: optionalText(parsed.guardianPhone),
        email: safeGuardianEmail
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId: session.schoolId,
        userId: session.id,
        action: "guardian.created",
        entity: "Guardian",
        entityId: guardian.id
      }
    });

    return { guardianId: guardian.id };
  });

  revalidatePath("/admin/responsaveis");
  redirect(`/admin/responsaveis/${result.guardianId}?sucesso=cadastro`);
}

export async function createTeacherAssignment(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = teacherAssignmentSchema.parse(Object.fromEntries(formData));
  const fallback = `/admin/professores/${parsed.teacherId}/atribuicoes`;
  const returnTo = assignmentReturnPath(parsed.returnTo, fallback);

  await Promise.all([
    prisma.teacher.findFirstOrThrow({
      where: { id: parsed.teacherId, schoolId: session.schoolId }
    }),
    prisma.classroom.findFirstOrThrow({
      where: { id: parsed.classroomId, schoolId: session.schoolId }
    }),
    prisma.subject.findFirstOrThrow({
      where: { id: parsed.subjectId, schoolId: session.schoolId }
    })
  ]);

  const existingAssignment = await prisma.teacherSubject.findFirst({
    where: {
      schoolId: session.schoolId,
      teacherId: parsed.teacherId,
      classroomId: parsed.classroomId,
      subjectId: parsed.subjectId
    },
    select: { id: true }
  });

  if (existingAssignment) {
    redirectWithStatus(returnTo, { erro: "duplicada" });
  }

  const assignment = await prisma.teacherSubject.create({
    data: {
      schoolId: session.schoolId,
      teacherId: parsed.teacherId,
      classroomId: parsed.classroomId,
      subjectId: parsed.subjectId
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "teacher_assignment.created",
      entity: "TeacherSubject",
      entityId: assignment.id
    }
  });

  revalidateAssignmentAdminPaths(parsed.teacherId, parsed.classroomId);
  redirectWithStatus(returnTo, { sucesso: "adicionada" });
}

export async function removeTeacherAssignment(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const assignmentId = z.string().min(1).parse(formData.get("assignmentId"));
  const returnTo = assignmentReturnPath(String(formData.get("returnTo") ?? ""), "/admin/professores");
  const assignment = await prisma.teacherSubject.findFirstOrThrow({
    where: { id: assignmentId, schoolId: session.schoolId },
    include: {
      classroom: true,
      subject: true,
      teacher: true
    }
  });

  const [gradeCount, attendanceCount] = await Promise.all([
    prisma.grade.count({
      where: {
        schoolId: session.schoolId,
        teacherId: assignment.teacherId,
        subjectId: assignment.subjectId,
        enrollment: {
          schoolId: session.schoolId,
          classroomId: assignment.classroomId
        }
      }
    }),
    prisma.attendance.count({
      where: {
        schoolId: session.schoolId,
        classroomId: assignment.classroomId,
        subjectId: assignment.subjectId
      }
    })
  ]);

  if (gradeCount > 0 || attendanceCount > 0) {
    redirectWithStatus(returnTo, { erro: "historico" });
  }

  await prisma.teacherSubject.delete({
    where: { id: assignment.id }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "teacher_assignment.deleted",
      entity: "TeacherSubject",
      entityId: assignment.id
    }
  });

  revalidateAssignmentAdminPaths(assignment.teacherId, assignment.classroomId);
  redirectWithStatus(returnTo, { sucesso: "removida" });
}

export async function saveGrades(formData: FormData) {
  const session = await requireSession(["PROFESSOR"]);
  const classroomId = z.string().min(1).parse(formData.get("classroomId"));
  const subjectId = z.string().min(1).parse(formData.get("subjectId"));
  const periodId = z.string().min(1).parse(formData.get("periodId"));

  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId: session.schoolId, userId: session.id }
  });
  const assignment = await prisma.teacherSubject.findFirstOrThrow({
    where: {
      schoolId: session.schoolId,
      teacherId: teacher.id,
      classroomId,
      subjectId
    },
    include: { classroom: { select: { academicYearId: true } } }
  });
  const period = await prisma.academicPeriod.findFirst({
    where: {
      id: periodId,
      schoolId: session.schoolId,
      academicYearId: assignment.classroom.academicYearId
    },
    include: { academicYear: true }
  });
  if (!period) {
    redirect(
      `/professor/turmas/${classroomId}?tab=notas&subjectId=${subjectId}&periodId=${periodId}&erro=periodo`
    );
  }
  if (isAcademicPeriodClosed(period)) {
    redirect(
      `/professor/turmas/${classroomId}?tab=notas&subjectId=${subjectId}&periodId=${periodId}&erro=periodo-encerrado`
    );
  }

  const enrollmentIds = formData.getAll("enrollmentId").map(String);
  for (const enrollmentId of enrollmentIds) {
    const enrollment = await prisma.enrollment.findFirstOrThrow({
      where: {
        id: enrollmentId,
        schoolId: session.schoolId,
        classroomId,
        academicYearId: assignment.classroom.academicYearId,
        status: "ACTIVE"
      }
    });
    const av1 = gradeValue.parse(formData.get(`av1-${enrollmentId}`));
    const av2 = gradeValue.parse(formData.get(`av2-${enrollmentId}`));
    const assignmentScore = gradeValue.parse(formData.get(`assignment-${enrollmentId}`));
    const average = Number(((av1 + av2 + assignmentScore) / 3).toFixed(1));

    const grade = await prisma.grade.upsert({
      where: {
        schoolId_enrollmentId_subjectId_academicPeriodId: {
          schoolId: session.schoolId,
          enrollmentId: enrollment.id,
          subjectId,
          academicPeriodId: periodId
        }
      },
      create: {
        schoolId: session.schoolId,
        enrollmentId: enrollment.id,
        subjectId,
        academicPeriodId: periodId,
        teacherId: teacher.id,
        av1,
        av2,
        assignment: assignmentScore,
        average
      },
      update: {
        teacherId: teacher.id,
        av1,
        av2,
        assignment: assignmentScore,
        average
      }
    });

    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        userId: session.id,
        action: "grade.upserted",
        entity: "Grade",
        entityId: grade.id
      }
    });
  }

  revalidatePath(`/professor/turmas/${classroomId}`);
  redirect(
    `/professor/turmas/${classroomId}?tab=notas&subjectId=${subjectId}&periodId=${periodId}&salvo=1`
  );
}

export async function saveAttendance(formData: FormData) {
  const session = await requireSession(["PROFESSOR"]);
  const classroomId = z.string().min(1).parse(formData.get("classroomId"));
  const subjectId = z.string().min(1).parse(formData.get("subjectId"));
  const dateValue = z.string().min(1).parse(formData.get("date"));
  const date = new Date(`${dateValue}T12:00:00.000Z`);

  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId: session.schoolId, userId: session.id }
  });
  const assignment = await prisma.teacherSubject.findFirstOrThrow({
    where: {
      schoolId: session.schoolId,
      teacherId: teacher.id,
      classroomId,
      subjectId
    },
    include: { classroom: { select: { academicYearId: true } } }
  });

  const periods = await prisma.academicPeriod.findMany({
    where: {
      schoolId: session.schoolId,
      academicYearId: assignment.classroom.academicYearId
    },
    include: { academicYear: true }
  });
  const period = findAcademicPeriodForDate(periods, date);
  if (!period) {
    redirect(
      `/professor/turmas/${classroomId}?tab=frequencia&subjectId=${subjectId}&data=${dateValue}&erro=periodo-data`
    );
  }
  if (isAcademicPeriodClosed(period)) {
    redirect(
      `/professor/turmas/${classroomId}?tab=frequencia&subjectId=${subjectId}&data=${dateValue}&erro=periodo-encerrado`
    );
  }

  const enrollmentIds = formData.getAll("enrollmentId").map(String);
  for (const enrollmentId of enrollmentIds) {
    const status = z
      .enum(["PRESENT", "ABSENT", "JUSTIFIED"])
      .parse(formData.get(`status-${enrollmentId}`));
    const attendance = await prisma.attendance.upsert({
      where: {
        schoolId_enrollmentId_subjectId_date: {
          schoolId: session.schoolId,
          enrollmentId,
          subjectId,
          date
        }
      },
      create: {
        schoolId: session.schoolId,
        enrollmentId,
        classroomId,
        subjectId,
        date,
        status
      },
      update: { status }
    });

    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        userId: session.id,
        action: "attendance.upserted",
        entity: "Attendance",
        entityId: attendance.id
      }
    });
  }

  revalidatePath(`/professor/turmas/${classroomId}`);
  redirect(
    `/professor/turmas/${classroomId}?tab=frequencia&subjectId=${subjectId}&data=${dateValue}&salvo=1`
  );
}

export async function createSubject(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithStatus("/admin/disciplinas", { erro: "validacao" });
  }
  const name = parsed.data.name;
  const code = parsed.data.code.toUpperCase();

  const existingByCode = await prisma.subject.findFirst({
    where: {
      schoolId: session.schoolId,
      code
    },
    select: { id: true }
  });

  if (existingByCode) {
    redirectWithStatus("/admin/disciplinas", { erro: "codigo" });
  }

  const existingByName = await prisma.subject.findFirst({
    where: {
      schoolId: session.schoolId,
      name: { equals: name, mode: "insensitive" }
    },
    select: { id: true }
  });

  if (existingByName) {
    redirectWithStatus("/admin/disciplinas", { erro: "nome" });
  }

  try {
    await prisma.subject.create({
      data: { schoolId: session.schoolId, name, code }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithStatus("/admin/disciplinas", { erro: "codigo" });
    }
    throw error;
  }

  revalidatePath("/admin/disciplinas");
  redirectWithStatus("/admin/disciplinas", { sucesso: "cadastro" });
}

export async function createAnnouncement(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirectWithStatus("/admin/comunicados", { erro: "validacao" });

  const data = parsed.data;
  const requestedClassroomId = optionalText(data.classroomId);
  let classroomId: string | null = null;

  if (announcementCanUseClassroom(data.audience) && requestedClassroomId) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: requestedClassroomId, schoolId: session.schoolId },
      select: { id: true }
    });
    if (!classroom) redirectWithStatus("/admin/comunicados", { erro: "turma" });
    classroomId = classroom.id;
  }

  if (announcementRequiresClassroom(data.audience) && !classroomId) {
    redirectWithStatus("/admin/comunicados", { erro: "turma-obrigatoria" });
  }

  await prisma.announcement.create({
    data: {
      schoolId: session.schoolId,
      authorId: session.id,
      title: data.title,
      content: data.content,
      audience: data.audience,
      classroomId
    }
  });
  revalidatePath("/admin/comunicados");
  revalidatePath("/admin/dashboard");
  revalidatePath("/professor/comunicados");
  revalidatePath("/professor/dashboard");
  revalidatePath("/aluno/comunicados");
  revalidatePath("/aluno/dashboard");
  revalidatePath("/responsavel/comunicados");
  revalidatePath("/responsavel/dashboard");
  redirectWithStatus("/admin/comunicados", { sucesso: "publicado" });
}

export async function createCalendarEvent(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z
    .object({
      academicYearId: z.string().min(1),
      title: z.string().trim().min(3),
      description: z.string().trim().optional(),
      type: z.enum(["PROVA", "REUNIAO", "EVENTO", "FERIADO", "ATIVIDADE", "PRAZO"]),
      startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal(""))
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithStatus("/admin/calendario", { erro: "validacao" });
  }

  const data = parsed.data;
  const startTime = data.startTime || null;
  const endTime = data.endTime || null;

  if (endTime && !startTime) {
    redirectWithStatus("/admin/calendario", { erro: "termino-sem-inicio" });
  }

  if (startTime && endTime && calendarDateTimeFromInput(data.startsAt, endTime) <= calendarDateTimeFromInput(data.startsAt, startTime)) {
    redirectWithStatus("/admin/calendario", { erro: "horario" });
  }

  await prisma.academicYear.findFirstOrThrow({
    where: { id: data.academicYearId, schoolId: session.schoolId }
  });

  await prisma.calendarEvent.create({
    data: {
      schoolId: session.schoolId,
      academicYearId: data.academicYearId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      startsAt: calendarDateFromInput(data.startsAt),
      startTime,
      endTime,
      endsAt: endTime ? calendarDateTimeFromInput(data.startsAt, endTime) : null
    }
  });

  revalidatePath("/admin/calendario");
  revalidatePath("/admin/dashboard");
  revalidatePath("/professor/calendario");
  revalidatePath("/professor/dashboard");
  revalidatePath("/aluno/calendario");
  revalidatePath("/aluno/dashboard");
  revalidatePath("/responsavel/calendario");
  revalidatePath("/responsavel/dashboard");
  redirectWithStatus("/admin/calendario", { sucesso: "evento-criado" });
}
