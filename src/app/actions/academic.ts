"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDemoPassword, schoolConfig } from "@/config/school";
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

function optionalDate(value?: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}

export async function createEnrollment(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = enrollmentSchema.parse(Object.fromEntries(formData));

  const classroom = await prisma.classroom.findFirstOrThrow({
    where: { id: parsed.classroomId, schoolId: session.schoolId }
  });
  const academicYear = await prisma.academicYear.findFirstOrThrow({
    where: { id: parsed.academicYearId, schoolId: session.schoolId }
  });

  const passwordHash = await bcrypt.hash(getDemoPassword(), 10);
  const safeEmail =
    parsed.studentEmail ||
    `aluno.${Date.now()}@${schoolConfig.demo.emailDomain}`.toLowerCase();

  const studentUser = await prisma.user.create({
    data: {
      schoolId: session.schoolId,
      name: parsed.studentName,
      email: safeEmail,
      passwordHash,
      role: "ALUNO"
    }
  });

  const student = await prisma.student.create({
    data: {
      schoolId: session.schoolId,
      userId: studentUser.id,
      fullName: parsed.studentName,
      cpf: parsed.studentCpf,
      birthDate: optionalDate(parsed.birthDate),
      gender: parsed.gender,
      phone: parsed.studentPhone,
      email: safeEmail,
      address: parsed.address
    }
  });

  let guardianId = parsed.existingGuardianId || "";
  if (!guardianId) {
    const guardianName = parsed.guardianName || `Responsável de ${parsed.studentName}`;
    const guardianEmail =
      parsed.guardianEmail ||
      `responsavel.${Date.now()}@${schoolConfig.demo.emailDomain}`.toLowerCase();
    const guardianUser = await prisma.user.create({
      data: {
        schoolId: session.schoolId,
        name: guardianName,
        email: guardianEmail,
        passwordHash,
        role: "RESPONSAVEL"
      }
    });
    const guardian = await prisma.guardian.create({
      data: {
        schoolId: session.schoolId,
        userId: guardianUser.id,
        fullName: guardianName,
        cpf: parsed.guardianCpf,
        relation: parsed.relation || "Responsável",
        phone: parsed.guardianPhone,
        email: guardianEmail
      }
    });
    guardianId = guardian.id;
  } else {
    await prisma.guardian.findFirstOrThrow({
      where: { id: guardianId, schoolId: session.schoolId }
    });
  }

  await prisma.guardianStudent.create({
    data: {
      guardianId,
      studentId: student.id,
      isPrimary: true
    }
  });

  const enrollment = await prisma.enrollment.create({
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

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "enrollment.created",
      entity: "Enrollment",
      entityId: enrollment.id
    }
  });

  revalidatePath("/admin/alunos");
  redirect(`/admin/alunos/${student.id}?sucesso=matricula`);
}

export async function saveGrades(formData: FormData) {
  const session = await requireSession(["PROFESSOR"]);
  const classroomId = z.string().min(1).parse(formData.get("classroomId"));
  const subjectId = z.string().min(1).parse(formData.get("subjectId"));
  const periodId = z.string().min(1).parse(formData.get("periodId"));

  const teacher = await prisma.teacher.findFirstOrThrow({
    where: { schoolId: session.schoolId, userId: session.id }
  });
  await prisma.teacherSubject.findFirstOrThrow({
    where: {
      schoolId: session.schoolId,
      teacherId: teacher.id,
      classroomId,
      subjectId
    }
  });

  const enrollmentIds = formData.getAll("enrollmentId").map(String);
  for (const enrollmentId of enrollmentIds) {
    const enrollment = await prisma.enrollment.findFirstOrThrow({
      where: { id: enrollmentId, schoolId: session.schoolId, classroomId }
    });
    const av1 = gradeValue.parse(formData.get(`av1-${enrollmentId}`));
    const av2 = gradeValue.parse(formData.get(`av2-${enrollmentId}`));
    const assignment = gradeValue.parse(formData.get(`assignment-${enrollmentId}`));
    const average = Number(((av1 + av2 + assignment) / 3).toFixed(1));

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
        assignment,
        average
      },
      update: {
        teacherId: teacher.id,
        av1,
        av2,
        assignment,
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
  await prisma.teacherSubject.findFirstOrThrow({
    where: {
      schoolId: session.schoolId,
      teacherId: teacher.id,
      classroomId,
      subjectId
    }
  });

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
  const name = z.string().min(2).parse(formData.get("name"));
  const code = z.string().min(2).max(8).parse(formData.get("code")).toUpperCase();

  await prisma.subject.create({
    data: { schoolId: session.schoolId, name, code }
  });
  revalidatePath("/admin/disciplinas");
}

export async function createAnnouncement(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const data = z
    .object({
      title: z.string().min(3),
      content: z.string().min(5),
      audience: z.enum(["SCHOOL", "PROFESSORS", "STUDENTS", "GUARDIANS", "CLASSROOM"]),
      classroomId: z.string().optional()
    })
    .parse(Object.fromEntries(formData));

  await prisma.announcement.create({
    data: {
      schoolId: session.schoolId,
      authorId: session.id,
      title: data.title,
      content: data.content,
      audience: data.audience,
      classroomId: data.audience === "CLASSROOM" ? data.classroomId || null : null
    }
  });
  revalidatePath("/admin/comunicados");
}

export async function createCalendarEvent(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const data = z
    .object({
      academicYearId: z.string().min(1),
      title: z.string().min(3),
      description: z.string().optional(),
      type: z.enum(["PROVA", "REUNIAO", "EVENTO", "FERIADO", "ATIVIDADE", "PRAZO"]),
      startsAt: z.string().min(1)
    })
    .parse(Object.fromEntries(formData));

  await prisma.academicYear.findFirstOrThrow({
    where: { id: data.academicYearId, schoolId: session.schoolId }
  });
  await prisma.calendarEvent.create({
    data: {
      schoolId: session.schoolId,
      academicYearId: data.academicYearId,
      title: data.title,
      description: data.description,
      type: data.type,
      startsAt: new Date(`${data.startsAt}T12:00:00.000Z`)
    }
  });
  revalidatePath("/admin/calendario");
}
