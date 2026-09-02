import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDemoPassword, schoolConfig } from "@/config/school";
import { checkActiveStudentLimit, formatSchoolPlan } from "@/lib/commercial-plans";
import { prisma } from "@/lib/prisma";

export type EnrollmentRegistrationErrorCode =
  | "turma-ano"
  | "matricula-ativa"
  | "aluno-existente"
  | "email-aluno"
  | "responsavel-obrigatorio"
  | "responsavel-conflito"
  | "email-responsavel"
  | "matricula-duplicada"
  | "limite-alunos-ativos";

export class EnrollmentRegistrationError extends Error {
  constructor(public code: EnrollmentRegistrationErrorCode, message: string) {
    super(message);
    this.name = "EnrollmentRegistrationError";
  }
}

export type EnrollmentRegistrationInput = {
  schoolId: string;
  userId: string;
  studentName: string;
  studentCpf?: string;
  birthDate?: string;
  gender?: string;
  studentPhone?: string;
  studentEmail?: string;
  address?: string;
  existingGuardianId?: string;
  guardianName?: string;
  guardianCpf?: string;
  relation?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  academicYearId: string;
  classroomId: string;
  enrolledAt: string;
  registration?: string;
  auditAction?: string;
};

type TransactionClient = Prisma.TransactionClient;

export function optionalDate(value?: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}

export function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeEmail(value?: string) {
  return optionalText(value)?.toLowerCase();
}

function generatedDemoEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomUUID().slice(0, 8)}@${schoolConfig.demo.emailDomain}`.toLowerCase();
}

function generatedRegistration(year: number) {
  return `${year}${Date.now().toString().slice(-5)}${randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function createEnrollmentRegistration(input: EnrollmentRegistrationInput) {
  return prisma.$transaction((tx) => createEnrollmentRegistrationInTransaction(tx, input));
}

export async function getActiveStudentCapacity(tx: TransactionClient, schoolId: string, incomingStudents = 1) {
  const [school, activeStudentGroups] = await Promise.all([
    tx.school.findFirstOrThrow({
      where: { id: schoolId },
      select: { plan: true }
    }),
    tx.enrollment.groupBy({
      by: ["studentId"],
      where: { schoolId, status: "ACTIVE" }
    })
  ]);

  return {
    plan: school.plan,
    ...checkActiveStudentLimit(school.plan, activeStudentGroups.length, incomingStudents)
  };
}

export async function assertActiveStudentCapacity(tx: TransactionClient, schoolId: string, incomingStudents = 1) {
  const capacity = await getActiveStudentCapacity(tx, schoolId, incomingStudents);

  if (!capacity.allowed) {
    throw new EnrollmentRegistrationError(
      "limite-alunos-ativos",
      `O plano ${formatSchoolPlan(capacity.plan)} permite até ${capacity.maxActiveStudents} alunos ativos. ` +
        `Hoje há ${capacity.currentActiveStudents} aluno(s) ativo(s) e esta operação excederia o limite em ${capacity.exceededBy}.`
    );
  }

  return capacity;
}

export async function createEnrollmentRegistrationInTransaction(tx: TransactionClient, input: EnrollmentRegistrationInput) {
  const studentCpf = optionalText(input.studentCpf);
  const studentEmail = normalizeEmail(input.studentEmail);
  const guardianCpf = optionalText(input.guardianCpf);
  const guardianEmail = normalizeEmail(input.guardianEmail);
  const guardianName = optionalText(input.guardianName);
  const relation = optionalText(input.relation) ?? "Responsável";

  const classroom = await tx.classroom.findFirstOrThrow({
    where: { id: input.classroomId, schoolId: input.schoolId }
  });
  const academicYear = await tx.academicYear.findFirstOrThrow({
    where: { id: input.academicYearId, schoolId: input.schoolId }
  });

  if (classroom.academicYearId !== academicYear.id) {
    throw new EnrollmentRegistrationError("turma-ano", "A turma selecionada não pertence ao ano letivo informado.");
  }

  await assertActiveStudentCapacity(tx, input.schoolId, 1);

  const registration = optionalText(input.registration) ?? generatedRegistration(academicYear.year);
  const existingRegistration = await tx.enrollment.findUnique({
    where: { schoolId_registration: { schoolId: input.schoolId, registration } },
    select: { id: true }
  });
  if (existingRegistration) {
    throw new EnrollmentRegistrationError("matricula-duplicada", "Já existe uma matrícula com este número.");
  }

  const studentLookup = [
    studentCpf ? { cpf: studentCpf } : null,
    studentEmail ? { email: studentEmail } : null
  ].filter(Boolean) as Array<{ cpf: string } | { email: string }>;

  if (studentLookup.length) {
    const existingStudent = await tx.student.findFirst({
      where: {
        schoolId: input.schoolId,
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
      throw new EnrollmentRegistrationError("matricula-ativa", "O aluno já possui matrícula ativa neste ano letivo.");
    }

    if (existingStudent) {
      throw new EnrollmentRegistrationError("aluno-existente", "Já existe um aluno com estes dados.");
    }
  }

  if (studentEmail) {
    const existingUser = await tx.user.findFirst({
      where: { schoolId: input.schoolId, email: studentEmail },
      select: { id: true }
    });
    if (existingUser) throw new EnrollmentRegistrationError("email-aluno", "Já existe um usuário com o e-mail do aluno.");
  }

  const passwordHash = await bcrypt.hash(getDemoPassword(), 10);
  const safeEmail = studentEmail ?? generatedDemoEmail("aluno");

  const studentUser = await tx.user.create({
    data: {
      schoolId: input.schoolId,
      name: input.studentName,
      email: safeEmail,
      passwordHash,
      role: "ALUNO"
    }
  });

  const student = await tx.student.create({
    data: {
      schoolId: input.schoolId,
      userId: studentUser.id,
      fullName: input.studentName,
      cpf: studentCpf,
      birthDate: optionalDate(input.birthDate),
      gender: optionalText(input.gender),
      phone: optionalText(input.studentPhone),
      email: safeEmail,
      address: optionalText(input.address)
    }
  });

  let guardianId = input.existingGuardianId || "";
  if (guardianId) {
    await tx.guardian.findFirstOrThrow({
      where: { id: guardianId, schoolId: input.schoolId }
    });
  } else {
    const [guardianByCpf, guardianByEmail] = await Promise.all([
      guardianCpf
        ? tx.guardian.findFirst({ where: { schoolId: input.schoolId, cpf: guardianCpf }, select: { id: true } })
        : null,
      guardianEmail
        ? tx.guardian.findFirst({ where: { schoolId: input.schoolId, email: guardianEmail }, select: { id: true } })
        : null
    ]);

    if (guardianByCpf && guardianByEmail && guardianByCpf.id !== guardianByEmail.id) {
      throw new EnrollmentRegistrationError(
        "responsavel-conflito",
        "CPF e e-mail do responsável apontam para cadastros diferentes."
      );
    }

    const existingGuardian = guardianByCpf ?? guardianByEmail;
    if (existingGuardian) {
      guardianId = existingGuardian.id;
    } else {
      if (!guardianName) {
        throw new EnrollmentRegistrationError(
          "responsavel-obrigatorio",
          "Informe o responsável ou selecione um responsável existente."
        );
      }

      if (guardianEmail) {
        const existingGuardianUser = await tx.user.findFirst({
          where: { schoolId: input.schoolId, email: guardianEmail },
          select: { id: true }
        });
        if (existingGuardianUser) {
          throw new EnrollmentRegistrationError(
            "email-responsavel",
            "Já existe um usuário com o e-mail do responsável."
          );
        }
      }

      const safeGuardianEmail = guardianEmail ?? generatedDemoEmail("responsavel");
      const guardianUser = await tx.user.create({
        data: {
          schoolId: input.schoolId,
          name: guardianName,
          email: safeGuardianEmail,
          passwordHash,
          role: "RESPONSAVEL"
        }
      });
      const guardian = await tx.guardian.create({
        data: {
          schoolId: input.schoolId,
          userId: guardianUser.id,
          fullName: guardianName,
          cpf: guardianCpf,
          relation,
          phone: optionalText(input.guardianPhone),
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
      schoolId: input.schoolId,
      studentId: student.id,
      classroomId: classroom.id,
      academicYearId: academicYear.id,
      registration,
      enrolledAt: new Date(`${input.enrolledAt}T12:00:00.000Z`),
      status: "ACTIVE"
    }
  });

  await tx.auditLog.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId,
      action: input.auditAction ?? "enrollment.created",
      entity: "Enrollment",
      entityId: enrollment.id
    }
  });

  return { studentId: student.id, enrollmentId: enrollment.id };
}
