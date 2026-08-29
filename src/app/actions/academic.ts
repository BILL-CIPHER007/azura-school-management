"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDemoPassword, schoolConfig } from "@/config/school";
import { announcementCanUseClassroom, announcementRequiresClassroom } from "@/lib/announcements";
import { findAcademicPeriodForDate, getAcademicPeriodClosingState, isAcademicPeriodClosed } from "@/lib/academic-closing";
import { calendarDateFromInput, calendarDateTimeFromInput } from "@/lib/calendar-events";
import {
  initialStudentCsvImportState,
  parseStudentImportCsv,
  STUDENT_IMPORT_DATE_FORMAT,
  STUDENT_IMPORT_MAX_FILE_SIZE,
  type StudentCsvImportState,
  type StudentImportPreviewRow,
  type StudentImportRow
} from "@/lib/student-import-csv";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  createEnrollmentRegistration,
  createEnrollmentRegistrationInTransaction,
  EnrollmentRegistrationError,
  optionalText
} from "@/services/enrollment-registration";

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

const classDiarySchema = z.object({
  classroomId: z.string().min(1),
  subjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().trim().min(3),
  notes: z.string().trim().optional()
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

  const closingState = getAcademicPeriodClosingState(period);
  if (!closingState.canClose) {
    redirectWithStatus("/admin/configuracoes", {
      erro: "periodo-fora-do-prazo",
      periodo: period.name,
      estado: closingState.reason
    });
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
  let result: { studentId: string };

  try {
    result = await createEnrollmentRegistration({
      ...parsed,
      schoolId: session.schoolId,
      userId: session.id
    });
  } catch (error) {
    if (error instanceof EnrollmentRegistrationError) {
      redirectWithStatus("/admin/matriculas/nova", { erro: error.code });
    }
    throw error;
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/alunos/${result.studentId}?sucesso=matricula`);
}

function parseImportDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T12:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return isoDate;
}

function normalizeImportKey(value: string) {
  return value.trim().toLowerCase();
}

async function buildStudentImportPreview(schoolId: string, rows: StudentImportRow[]) {
  const [classrooms, academicYears] = await Promise.all([
    prisma.classroom.findMany({
      where: { schoolId },
      select: { id: true, name: true, academicYearId: true }
    }),
    prisma.academicYear.findMany({
      where: { schoolId },
      select: { id: true, year: true }
    })
  ]);
  const yearsByValue = new Map(academicYears.map((year) => [String(year.year), year]));
  const classroomsByYearAndName = new Map(
    classrooms.map((classroom) => [`${classroom.academicYearId}::${normalizeImportKey(classroom.name)}`, classroom])
  );
  const seenRegistrations = new Set<string>();
  const seenStudentEmails = new Set<string>();
  const seenStudentCpfs = new Set<string>();
  const previewRows: StudentImportPreviewRow[] = [];
  const validRows: StudentImportRow[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const studentEmail = optionalText(row.studentEmail)?.toLowerCase();
    const guardianEmail = optionalText(row.guardianEmail)?.toLowerCase();
    const studentCpf = optionalText(row.studentCpf);
    const guardianCpf = optionalText(row.guardianCpf);
    const registration = optionalText(row.registration);

    if (!optionalText(row.studentName)) errors.push("Informe o nome do aluno.");
    if (!optionalText(row.guardianName) && !guardianCpf && !guardianEmail) {
      errors.push("Informe o responsável ou dados suficientes para localizar um responsável existente.");
    }
    if (!optionalText(row.classroomName)) errors.push("Informe a turma.");
    if (!optionalText(row.academicYear)) errors.push("Informe o ano letivo.");
    if (!parseImportDate(row.enrolledAt)) {
      errors.push(`Informe a data de entrada no formato ${STUDENT_IMPORT_DATE_FORMAT}.`);
    }
    if (row.birthDate && !parseImportDate(row.birthDate)) {
      errors.push(`Informe a data de nascimento no formato ${STUDENT_IMPORT_DATE_FORMAT}.`);
    }
    if (studentEmail && !z.string().email().safeParse(studentEmail).success) errors.push("E-mail do aluno inválido.");
    if (guardianEmail && !z.string().email().safeParse(guardianEmail).success) {
      errors.push("E-mail do responsável inválido.");
    }

    const academicYear = yearsByValue.get(row.academicYear.trim());
    if (!academicYear && optionalText(row.academicYear)) errors.push("Ano letivo não encontrado.");
    const classroom = academicYear
      ? classroomsByYearAndName.get(`${academicYear.id}::${normalizeImportKey(row.classroomName)}`)
      : null;
    if (academicYear && !classroom) errors.push("Turma não encontrada para o ano letivo informado.");

    if (registration) {
      const registrationKey = normalizeImportKey(registration);
      if (seenRegistrations.has(registrationKey)) errors.push("Matrícula duplicada no arquivo.");
      seenRegistrations.add(registrationKey);
      const existingRegistration = await prisma.enrollment.findUnique({
        where: { schoolId_registration: { schoolId, registration } },
        select: { id: true }
      });
      if (existingRegistration) errors.push("Matrícula já cadastrada no sistema.");
    }

    if (studentEmail) {
      if (seenStudentEmails.has(studentEmail)) errors.push("E-mail do aluno duplicado no arquivo.");
      seenStudentEmails.add(studentEmail);
    }
    if (studentCpf) {
      const cpfKey = normalizeImportKey(studentCpf);
      if (seenStudentCpfs.has(cpfKey)) errors.push("CPF do aluno duplicado no arquivo.");
      seenStudentCpfs.add(cpfKey);
    }

    const studentLookup = [
      studentCpf ? { cpf: studentCpf } : null,
      studentEmail ? { email: studentEmail } : null
    ].filter(Boolean) as Array<{ cpf: string } | { email: string }>;
    if (studentLookup.length) {
      const existingStudent = await prisma.student.findFirst({
        where: { schoolId, OR: studentLookup },
        select: { id: true }
      });
      if (existingStudent) errors.push("Aluno já cadastrado no sistema.");
    }

    if (studentEmail) {
      const existingStudentUser = await prisma.user.findFirst({
        where: { schoolId, email: studentEmail },
        select: { id: true }
      });
      if (existingStudentUser) errors.push("E-mail do aluno já existe no sistema.");
    }

    const [guardianByCpf, guardianByEmail] = await Promise.all([
      guardianCpf
        ? prisma.guardian.findFirst({ where: { schoolId, cpf: guardianCpf }, select: { id: true } })
        : null,
      guardianEmail
        ? prisma.guardian.findFirst({ where: { schoolId, email: guardianEmail }, select: { id: true } })
        : null
    ]);
    if (guardianByCpf && guardianByEmail && guardianByCpf.id !== guardianByEmail.id) {
      errors.push("CPF e e-mail do responsável apontam para cadastros diferentes.");
    }
    if (guardianEmail && !guardianByCpf && !guardianByEmail) {
      const existingGuardianUser = await prisma.user.findFirst({
        where: { schoolId, email: guardianEmail },
        select: { id: true }
      });
      if (existingGuardianUser) errors.push("E-mail do responsável já existe no sistema.");
    }

    const previewRow: StudentImportPreviewRow = {
      ...row,
      studentEmail: studentEmail ?? "",
      guardianEmail: guardianEmail ?? "",
      status: errors.length ? "error" : "valid",
      errors
    };
    previewRows.push(previewRow);
    if (!errors.length) validRows.push(previewRow);
  }

  return {
    status: previewRows.some((row) => row.status === "error") ? "error" : "preview",
    totalRows: previewRows.length,
    validRows: validRows.length,
    rows: previewRows,
    payload: JSON.stringify(validRows)
  } satisfies StudentCsvImportState;
}

export async function validateStudentCsvImport(
  _state: StudentCsvImportState,
  formData: FormData
): Promise<StudentCsvImportState> {
  const session = await requireSession(["ADMIN"]);
  const file = formData.get("csvFile");
  if (!(file instanceof File)) {
    return { ...initialStudentCsvImportState, status: "error", message: "Selecione um arquivo CSV." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ...initialStudentCsvImportState, status: "error", message: "Envie um arquivo com extensão .csv." };
  }
  if (file.size > STUDENT_IMPORT_MAX_FILE_SIZE) {
    return { ...initialStudentCsvImportState, status: "error", message: "O arquivo CSV excede o tamanho permitido." };
  }

  const parsed = parseStudentImportCsv(await file.text());
  if (parsed.errors.length && !parsed.rows.length) {
    return { ...initialStudentCsvImportState, status: "error", message: parsed.errors.join(" ") };
  }

  const preview = await buildStudentImportPreview(session.schoolId, parsed.rows);
  if (parsed.errors.length) {
    return {
      ...preview,
      status: "error",
      payload: undefined,
      message: parsed.errors.join(" ")
    };
  }

  return {
    ...preview,
    message: preview.status === "error"
        ? "Revise os erros antes de confirmar a importação."
        : "Arquivo validado. Confira os dados antes de confirmar."
  };
}

export async function confirmStudentCsvImport(
  _state: StudentCsvImportState,
  formData: FormData
): Promise<StudentCsvImportState> {
  const session = await requireSession(["ADMIN"]);
  const payload = String(formData.get("payload") ?? "");
  let rows: StudentImportRow[] = [];

  try {
    rows = JSON.parse(payload) as StudentImportRow[];
  } catch {
    return { ...initialStudentCsvImportState, status: "error", message: "Pré-visualização inválida. Valide o CSV novamente." };
  }

  const preview = await buildStudentImportPreview(session.schoolId, rows);
  if (preview.status === "error" || !preview.validRows) {
    return {
      ...preview,
      message: "Os dados mudaram ou ainda possuem erros. Valide o CSV novamente antes de confirmar."
    };
  }

  let created = 0;
  try {
    created = await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];
      for (const row of rows) {
        const enrolledAt = parseImportDate(row.enrolledAt);
        const birthDate = row.birthDate ? parseImportDate(row.birthDate) : undefined;
        if (!enrolledAt || birthDate === null) {
          throw new Error("Data inválida após a pré-validação.");
        }
        const academicYear = await tx.academicYear.findFirstOrThrow({
          where: { schoolId: session.schoolId, year: Number(row.academicYear) },
          select: { id: true }
        });
        const classroom = await tx.classroom.findFirstOrThrow({
          where: {
            schoolId: session.schoolId,
            academicYearId: academicYear.id,
            name: { equals: row.classroomName, mode: "insensitive" }
          },
          select: { id: true }
        });
        const result = await createEnrollmentRegistrationInTransaction(tx, {
          schoolId: session.schoolId,
          userId: session.id,
          studentName: row.studentName,
          studentCpf: row.studentCpf,
          birthDate,
          studentPhone: row.studentPhone,
          studentEmail: row.studentEmail,
          guardianName: row.guardianName,
          guardianCpf: row.guardianCpf,
          relation: row.relation,
          guardianPhone: row.guardianPhone,
          guardianEmail: row.guardianEmail,
          academicYearId: academicYear.id,
          classroomId: classroom.id,
          enrolledAt,
          registration: row.registration,
          auditAction: "student_import.enrollment_created"
        });
        createdIds.push(result.enrollmentId);
      }

      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          userId: session.id,
          action: "student_import.completed",
          entity: "Enrollment",
          entityId: createdIds[0] ?? "student-import"
        }
      });

      return createdIds.length;
    });
  } catch (error) {
    if (error instanceof EnrollmentRegistrationError) {
      return {
        ...preview,
        status: "error",
        payload: undefined,
        message: `A importação foi interrompida: ${error.message}`
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ...preview,
        status: "error",
        payload: undefined,
        message: "A importação foi interrompida por dados duplicados. Valide o CSV novamente."
      };
    }
    throw error;
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/dashboard");

  return {
    ...initialStudentCsvImportState,
    status: "success",
    totalRows: rows.length,
    validRows: rows.length,
    createdRows: created,
    message: `${created} matrícula${created === 1 ? "" : "s"} criada${created === 1 ? "" : "s"} com sucesso.`
  };
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

export async function saveClassDiaryEntry(formData: FormData) {
  const session = await requireSession(["PROFESSOR"]);
  const parsed = classDiarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithStatus("/professor/turmas", { erro: "diario-validacao" });
  }

  const { classroomId, subjectId, date: dateValue, content, notes } = parsed.data;
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
      `/professor/turmas/${classroomId}?tab=diario&subjectId=${subjectId}&data=${dateValue}&erro=periodo-data`
    );
  }
  if (isAcademicPeriodClosed(period)) {
    redirect(
      `/professor/turmas/${classroomId}?tab=diario&subjectId=${subjectId}&data=${dateValue}&erro=periodo-encerrado`
    );
  }

  const entry = await prisma.classDiaryEntry.upsert({
    where: {
      schoolId_classroomId_subjectId_teacherId_date: {
        schoolId: session.schoolId,
        classroomId,
        subjectId,
        teacherId: teacher.id,
        date
      }
    },
    create: {
      schoolId: session.schoolId,
      classroomId,
      subjectId,
      teacherId: teacher.id,
      date,
      content,
      notes: notes || null
    },
    update: {
      content,
      notes: notes || null
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      userId: session.id,
      action: "class_diary.upserted",
      entity: "ClassDiaryEntry",
      entityId: entry.id
    }
  });

  revalidatePath(`/professor/turmas/${classroomId}`);
  revalidatePath(`/admin/turmas/${classroomId}`);
  redirect(`/professor/turmas/${classroomId}?tab=diario&subjectId=${subjectId}&data=${dateValue}&salvo=diario`);
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
