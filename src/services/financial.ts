import type { ChargeStatus, Prisma } from "@prisma/client";
import { hasCommercialFeature } from "@/lib/commercial-plans";
import {
  dateFromCivilInput,
  getChargeDisplayStatus,
  parseCurrencyInput,
  todayCivilDate
} from "@/lib/financial-core";
import { prisma } from "@/lib/prisma";

export type FinancialFilterStatus = ChargeStatus | "OVERDUE";

export type ChargeFormInput = {
  studentId: string;
  enrollmentId?: string;
  reference: string;
  description?: string;
  amount: string;
  dueDate: string;
};

export type ChargeUpdateInput = {
  chargeId: string;
  reference: string;
  description?: string;
  amount: string;
  dueDate: string;
};

export class FinancialError extends Error {
  constructor(public code: "plano" | "aluno" | "matricula" | "valor" | "data" | "status" | "cobranca", message: string) {
    super(message);
    this.name = "FinancialError";
  }
}

type TransactionClient = Prisma.TransactionClient;

export async function getFinancialFeatureAccess(schoolId: string) {
  const school = await prisma.school.findFirstOrThrow({
    where: { id: schoolId },
    select: { plan: true }
  });

  return hasCommercialFeature(school.plan, "finance");
}

export async function assertFinancialFeature(schoolId: string, tx: TransactionClient | typeof prisma = prisma) {
  const school = await tx.school.findFirstOrThrow({
    where: { id: schoolId },
    select: { plan: true }
  });

  if (!hasCommercialFeature(school.plan, "finance")) {
    throw new FinancialError("plano", "O financeiro esta disponivel apenas no plano Profissional.");
  }

  return school.plan;
}

function chargeWhereByStatus(status?: FinancialFilterStatus): Prisma.ChargeWhereInput {
  if (!status) return {};
  if (status === "OVERDUE") {
    return {
      status: "PENDING",
      dueDate: { lt: todayCivilDate() }
    };
  }
  if (status === "PENDING") {
    return {
      status: "PENDING",
      dueDate: { gte: todayCivilDate() }
    };
  }
  return { status };
}

function parseChargeInput(input: ChargeFormInput | ChargeUpdateInput) {
  const amount = parseCurrencyInput(input.amount);
  const dueDate = dateFromCivilInput(input.dueDate);
  const reference = input.reference.trim();
  const description = input.description?.trim() || null;

  if (!reference) throw new FinancialError("cobranca", "Informe a referencia da cobranca.");
  if (!amount) throw new FinancialError("valor", "Informe um valor valido maior que zero.");
  if (!dueDate) throw new FinancialError("data", "Informe uma data de vencimento valida.");

  return { amount, dueDate, reference, description };
}

async function resolveChargeStudent(tx: TransactionClient, schoolId: string, studentId: string, enrollmentId?: string) {
  const student = await tx.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      guardians: {
        where: { guardian: { schoolId } },
        include: { guardian: true },
        orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }]
      },
      enrollments: {
        where: enrollmentId ? { id: enrollmentId, schoolId } : { schoolId, status: "ACTIVE" },
        orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
        take: 1
      }
    }
  });

  if (!student) throw new FinancialError("aluno", "Aluno nao encontrado nesta escola.");
  const enrollment = student.enrollments[0] ?? null;
  if (enrollmentId && !enrollment) throw new FinancialError("matricula", "Matricula nao pertence ao aluno informado.");

  return {
    student,
    enrollmentId: enrollment?.id ?? null,
    guardianId: student.guardians[0]?.guardianId ?? null
  };
}

export async function createCharge(schoolId: string, userId: string, input: ChargeFormInput) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const parsed = parseChargeInput(input);
    const studentContext = await resolveChargeStudent(tx, schoolId, input.studentId, input.enrollmentId || undefined);

    const charge = await tx.charge.create({
      data: {
        schoolId,
        studentId: studentContext.student.id,
        guardianId: studentContext.guardianId,
        enrollmentId: studentContext.enrollmentId,
        reference: parsed.reference,
        description: parsed.description,
        amount: parsed.amount,
        dueDate: parsed.dueDate
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.created",
        entity: "Charge",
        entityId: charge.id
      }
    });

    return charge.id;
  });
}

export async function updateCharge(schoolId: string, userId: string, input: ChargeUpdateInput) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const parsed = parseChargeInput(input);
    const charge = await tx.charge.findFirst({ where: { id: input.chargeId, schoolId } });

    if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
    if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser editadas.");

    await tx.charge.update({
      where: { id: charge.id },
      data: {
        reference: parsed.reference,
        description: parsed.description,
        amount: parsed.amount,
        dueDate: parsed.dueDate
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.updated",
        entity: "Charge",
        entityId: charge.id
      }
    });
  });
}

export async function markChargePaid(schoolId: string, userId: string, chargeId: string) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const charge = await tx.charge.findFirst({ where: { id: chargeId, schoolId } });

    if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
    if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser pagas manualmente.");

    await tx.charge.update({
      where: { id: charge.id },
      data: { status: "PAID", paidAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.manual_payment",
        entity: "Charge",
        entityId: charge.id
      }
    });
  });
}

export async function cancelCharge(schoolId: string, userId: string, chargeId: string) {
  return prisma.$transaction(async (tx) => {
    await assertFinancialFeature(schoolId, tx);
    const charge = await tx.charge.findFirst({ where: { id: chargeId, schoolId } });

    if (!charge) throw new FinancialError("cobranca", "Cobranca nao encontrada.");
    if (charge.status !== "PENDING") throw new FinancialError("status", "Somente cobrancas pendentes podem ser canceladas.");

    await tx.charge.update({
      where: { id: charge.id },
      data: { status: "CANCELED", canceledAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId,
        action: "financial_charge.canceled",
        entity: "Charge",
        entityId: charge.id
      }
    });
  });
}

export async function getAdminFinancialOverview(
  schoolId: string,
  filters: { month?: string; status?: FinancialFilterStatus; studentId?: string; guardianId?: string } = {}
) {
  await assertFinancialFeature(schoolId);

  const monthMatch = filters.month?.match(/^(\d{4})-(\d{2})$/);
  const monthStart = monthMatch ? dateFromCivilInput(`${filters.month}-01`) : null;
  const monthEnd = monthStart ? new Date(Date.UTC(Number(monthMatch?.[1]), Number(monthMatch?.[2]), 1, 12)) : null;

  const chargeWhere: Prisma.ChargeWhereInput = {
    schoolId,
    studentId: filters.studentId || undefined,
    guardianId: filters.guardianId || undefined,
    dueDate: monthStart && monthEnd ? { gte: monthStart, lt: monthEnd } : undefined,
    ...chargeWhereByStatus(filters.status)
  };

  const [charges, students, guardians, summaryCharges] = await Promise.all([
    prisma.charge.findMany({
      where: chargeWhere,
      include: {
        student: true,
        guardian: true,
        enrollment: { include: { classroom: true, academicYear: true } }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.student.findMany({
      where: { schoolId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { classroom: true, academicYear: true },
          orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
          take: 1
        }
      },
      orderBy: { fullName: "asc" }
    }),
    prisma.guardian.findMany({
      where: { schoolId },
      orderBy: { fullName: "asc" }
    }),
    prisma.charge.findMany({
      where: {
        schoolId,
        dueDate: monthStart && monthEnd ? { gte: monthStart, lt: monthEnd } : undefined
      },
      select: { amount: true, dueDate: true, status: true }
    })
  ]);

  const summary = summaryCharges.reduce(
    (accumulator, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      const amount = Number(charge.amount);
      if (displayStatus === "OVERDUE") accumulator.overdue += amount;
      if (displayStatus === "PENDING") accumulator.pending += amount;
      if (displayStatus === "PAID") accumulator.paid += amount;
      accumulator.count += 1;
      return accumulator;
    },
    { pending: 0, overdue: 0, paid: 0, count: 0 }
  );

  return { charges, students, guardians, summary };
}

export async function getStudentFinancialSummary(schoolId: string, studentId: string) {
  if (!(await getFinancialFeatureAccess(schoolId))) return null;

  const charges = await prisma.charge.findMany({
    where: { schoolId, studentId },
    select: { amount: true, dueDate: true, status: true }
  });

  return charges.reduce(
    (summary, charge) => {
      const displayStatus = getChargeDisplayStatus(charge.status, charge.dueDate);
      if (displayStatus === "PENDING" || displayStatus === "OVERDUE") {
        summary.openAmount += Number(charge.amount);
      }
      summary.count += 1;
      return summary;
    },
    { count: 0, openAmount: 0 }
  );
}

export async function getGuardianFinancialPortal(schoolId: string, userId: string, selectedStudentId?: string) {
  await assertFinancialFeature(schoolId);

  const guardian = await prisma.guardian.findFirstOrThrow({
    where: { schoolId, userId },
    include: {
      students: {
        include: {
          student: {
            include: {
              enrollments: {
                include: { classroom: true, academicYear: true },
                orderBy: [{ academicYear: { year: "desc" } }, { enrolledAt: "desc" }],
                take: 1
              }
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }]
      }
    }
  });

  const children = guardian.students.map((item) => item.student);
  const selectedStudent = children.find((student) => student.id === selectedStudentId) ?? children[0] ?? null;

  const charges = selectedStudent
    ? await prisma.charge.findMany({
        where: { schoolId, studentId: selectedStudent.id },
        include: {
          student: true,
          enrollment: { include: { classroom: true, academicYear: true } }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
      })
    : [];

  return { guardian, children, selectedStudent, charges };
}
