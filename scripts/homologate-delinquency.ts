import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  dateFromCivilInput,
  getDaysOverdue,
  getDelinquencyBucket,
  isChargeDelinquent,
  isPaymentPromiseOverdue,
  toCivilDateKey,
  todayCivilDate
} from "../src/lib/financial-core";
import { prisma } from "../src/lib/prisma";
import {
  FinancialError,
  getAdminDelinquencyOverview,
  getGuardianFinancialPortal,
  registerCollectionAction
} from "../src/services/financial";

const slugPrefix = "homologacao-inadimplencia-";

function addCivilDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const normalized = dateFromCivilInput(toCivilDateKey(next));
  assert.ok(normalized);
  return normalized;
}

async function cleanup() {
  await prisma.school.deleteMany({
    where: { slug: { startsWith: slugPrefix } }
  });
}

async function createBaseSchool(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string) {
  const school = await prisma.school.create({
    data: {
      name: `Homologacao Inadimplencia ${suffix}`,
      slug: `${slugPrefix}${suffix}`,
      plan
    }
  });
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Admin ${suffix}`,
      email: `admin-${suffix}@homologacao.local`,
      passwordHash: "hash",
      role: "ADMIN"
    }
  });
  const guardianUser = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Responsavel ${suffix}`,
      email: `responsavel-${suffix}@homologacao.local`,
      passwordHash: "hash",
      role: "RESPONSAVEL"
    }
  });
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      year: 2026,
      startsAt: dateFromCivilInput("2026-01-20")!,
      endsAt: dateFromCivilInput("2026-12-15")!,
      isActive: true
    }
  });
  const classroom = await prisma.classroom.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: `6 Ano ${suffix}`,
      gradeLevel: "6 Ano",
      shift: "MATUTINO"
    }
  });
  const guardian = await prisma.guardian.create({
    data: {
      schoolId: school.id,
      userId: guardianUser.id,
      fullName: `Responsavel ${suffix}`,
      cpf: "12345678901",
      relation: "Responsavel",
      phone: "(11) 99999-0000",
      email: `responsavel-${suffix}@homologacao.local`
    }
  });

  return { school, admin, guardianUser, academicYear, classroom, guardian };
}

async function createStudentWithEnrollment(input: {
  schoolId: string;
  guardianId: string;
  classroomId: string;
  academicYearId: string;
  suffix: string;
}) {
  const student = await prisma.student.create({
    data: {
      schoolId: input.schoolId,
      fullName: `Aluno ${input.suffix}`,
      guardians: {
        create: {
          guardianId: input.guardianId,
          isPrimary: true
        }
      }
    }
  });
  const enrollment = await prisma.enrollment.create({
    data: {
      schoolId: input.schoolId,
      studentId: student.id,
      classroomId: input.classroomId,
      academicYearId: input.academicYearId,
      registration: `HOM-${input.suffix}`,
      enrolledAt: dateFromCivilInput("2026-01-20")!
    }
  });

  return { student, enrollment };
}

async function createCharge(input: {
  schoolId: string;
  studentId: string;
  guardianId: string;
  enrollmentId: string;
  reference: string;
  amount?: string;
  dueDate: Date;
  status?: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  competence?: string;
  provider?: "ASAAS";
  externalStatus?: string;
  syncError?: string;
  paidAt?: Date | null;
  canceledAt?: Date | null;
  refundedAt?: Date | null;
}) {
  return prisma.charge.create({
    data: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      guardianId: input.guardianId,
      enrollmentId: input.enrollmentId,
      reference: input.reference,
      amount: new Prisma.Decimal(input.amount ?? "100.00"),
      dueDate: input.dueDate,
      status: input.status ?? "PENDING",
      competence: input.competence ?? "2026-09",
      provider: input.provider,
      externalStatus: input.externalStatus,
      syncError: input.syncError,
      paidAt: input.paidAt,
      canceledAt: input.canceledAt,
      refundedAt: input.refundedAt
    }
  });
}

async function main() {
  await cleanup();

  const today = todayCivilDate();
  const professional = await createBaseSchool("PROFISSIONAL", "profissional");
  const otherSchool = await createBaseSchool("PROFISSIONAL", "outra-escola");
  const essential = await createBaseSchool("ESSENCIAL", "essencial");

  const primaryStudent = await createStudentWithEnrollment({
    schoolId: professional.school.id,
    guardianId: professional.guardian.id,
    classroomId: professional.classroom.id,
    academicYearId: professional.academicYear.id,
    suffix: "principal"
  });
  const secondStudent = await createStudentWithEnrollment({
    schoolId: professional.school.id,
    guardianId: professional.guardian.id,
    classroomId: professional.classroom.id,
    academicYearId: professional.academicYear.id,
    suffix: "segundo"
  });
  const otherStudent = await createStudentWithEnrollment({
    schoolId: otherSchool.school.id,
    guardianId: otherSchool.guardian.id,
    classroomId: otherSchool.classroom.id,
    academicYearId: otherSchool.academicYear.id,
    suffix: "outra-escola"
  });

  const futureCharge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Futura",
    dueDate: addCivilDays(today, 1)
  });
  const todayCharge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Vence hoje",
    dueDate: today
  });
  const day1Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 1 dia",
    dueDate: addCivilDays(today, -1)
  });
  const day5Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 5 dias",
    dueDate: addCivilDays(today, -5)
  });
  const day6Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 6 dias",
    dueDate: addCivilDays(today, -6),
    provider: "ASAAS",
    externalStatus: "PENDING"
  });
  const day15Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 15 dias",
    dueDate: addCivilDays(today, -15),
    provider: "ASAAS",
    externalStatus: "OVERDUE"
  });
  const day16Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 16 dias",
    dueDate: addCivilDays(today, -16),
    syncError: "Erro seguro de homologacao"
  });
  const day30Charge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Atraso 30 dias",
    dueDate: addCivilDays(today, -30),
    amount: "300.00",
    externalStatus: "RECEIVED"
  });
  const paidCharge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Paga",
    dueDate: addCivilDays(today, -20),
    status: "PAID",
    paidAt: today
  });
  const canceledCharge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Cancelada",
    dueDate: addCivilDays(today, -20),
    status: "CANCELED",
    canceledAt: today
  });
  const refundedCharge = await createCharge({
    ...professionalIds(professional, primaryStudent),
    reference: "Reembolsada",
    dueDate: addCivilDays(today, -20),
    status: "REFUNDED",
    refundedAt: today
  });
  await createCharge({
    schoolId: otherSchool.school.id,
    studentId: otherStudent.student.id,
    guardianId: otherSchool.guardian.id,
    enrollmentId: otherStudent.enrollment.id,
    reference: "Outra escola",
    dueDate: addCivilDays(today, -8)
  });
  await createCharge({
    ...professionalIds(professional, secondStudent),
    reference: "Segundo filho",
    dueDate: addCivilDays(today, -4),
    amount: "200.00"
  });

  assert.equal(isChargeDelinquent("PENDING", futureCharge.dueDate, today), false);
  assert.equal(isChargeDelinquent("PENDING", todayCharge.dueDate, today), false);
  assert.equal(isChargeDelinquent("PENDING", day1Charge.dueDate, today), true);
  assert.equal(isChargeDelinquent("PAID", paidCharge.dueDate, today), false);
  assert.equal(isChargeDelinquent("CANCELED", canceledCharge.dueDate, today), false);
  assert.equal(isChargeDelinquent("REFUNDED", refundedCharge.dueDate, today), false);
  assert.equal(getDaysOverdue(todayCharge.dueDate, today), 0);
  assert.equal(getDelinquencyBucket(getDaysOverdue(day1Charge.dueDate, today)), "ATRASO_LEVE");
  assert.equal(getDelinquencyBucket(getDaysOverdue(day5Charge.dueDate, today)), "ATRASO_LEVE");
  assert.equal(getDelinquencyBucket(getDaysOverdue(day6Charge.dueDate, today)), "ATRASO_MODERADO");
  assert.equal(getDelinquencyBucket(getDaysOverdue(day15Charge.dueDate, today)), "ATRASO_MODERADO");
  assert.equal(getDelinquencyBucket(getDaysOverdue(day16Charge.dueDate, today)), "ATRASO_CRITICO");
  assert.equal(getDelinquencyBucket(getDaysOverdue(day30Charge.dueDate, today)), "ATRASO_CRITICO");

  const overview = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(overview.rows.length, 7);
  assert.equal(overview.rows.some((row) => row.charge.id === futureCharge.id), false);
  assert.equal(overview.rows.some((row) => row.charge.id === todayCharge.id), false);
  assert.equal(overview.rows.some((row) => row.charge.id === paidCharge.id), false);
  assert.equal(overview.rows.some((row) => row.charge.id === canceledCharge.id), false);
  assert.equal(overview.rows.some((row) => row.charge.id === refundedCharge.id), false);
  assert.equal(overview.summary.overdueCount, 7);
  assert.equal(overview.summary.delinquentGuardians, 1);
  assert.equal(overview.summary.buckets.ATRASO_LEVE.count, 3);
  assert.equal(overview.summary.buckets.ATRASO_MODERADO.count, 2);
  assert.equal(overview.summary.buckets.ATRASO_CRITICO.count, 2);

  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { bucket: "ATRASO_LEVE" })).rows.length, 3);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { bucket: "ATRASO_MODERADO" })).rows.length, 2);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { bucket: "ATRASO_CRITICO" })).rows.length, 2);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { classroomId: professional.classroom.id })).rows.length, 7);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { classroomId: otherSchool.classroom.id })).rows.length, 0);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { studentId: primaryStudent.student.id })).rows.length, 6);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { studentId: secondStudent.student.id })).rows.length, 1);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { guardianId: professional.guardian.id })).rows.length, 7);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { competence: "2026-09" })).rows.length, 7);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { status: "NO_GATEWAY" })).rows.length, 5);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { status: "ASAAS_PENDING" })).rows.length, 1);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { status: "ASAAS_OVERDUE" })).rows.length, 1);
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { status: "SYNC_ERROR" })).rows.length, 1);
  assert.equal(
    (await getAdminDelinquencyOverview(professional.school.id, {
      dueFrom: toCivilDateKey(day5Charge.dueDate),
      dueTo: toCivilDateKey(day5Charge.dueDate)
    })).rows.length,
    1
  );
  assert.equal((await getAdminDelinquencyOverview(professional.school.id, { competence: "2099-01" })).rows.length, 0);
  await assert.rejects(
    () => getAdminDelinquencyOverview(professional.school.id, { competence: "09/2026" }),
    (error) => error instanceof FinancialError && error.code === "competencia"
  );

  const beforeActionCharge = await prisma.charge.findUniqueOrThrow({ where: { id: day30Charge.id } });
  const channels = ["PHONE", "WHATSAPP", "EMAIL", "IN_PERSON", "OTHER"] as const;
  for (const channel of channels) {
    await registerCollectionAction(professional.school.id, professional.admin.id, {
      chargeId: day30Charge.id,
      type: "CONTACT",
      channel,
      note: `Contato por ${channel}`
    });
  }
  await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: day30Charge.id,
    type: "CONTACTED"
  });
  await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: day30Charge.id,
    type: "NOTE",
    note: "Observacao interna da homologacao."
  });
  await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: day30Charge.id,
    type: "PAYMENT_PROMISE",
    promisedDate: toCivilDateKey(addCivilDays(today, 3)),
    note: "Promessa futura."
  });
  await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: day16Charge.id,
    type: "PAYMENT_PROMISE",
    promisedDate: toCivilDateKey(addCivilDays(today, -2)),
    note: "Promessa vencida."
  });

  const afterActionCharge = await prisma.charge.findUniqueOrThrow({
    where: { id: day30Charge.id },
    include: { collectionActions: true, financialEvents: true }
  });
  assert.equal(afterActionCharge.status, beforeActionCharge.status);
  assert.equal(afterActionCharge.amount.toString(), beforeActionCharge.amount.toString());
  assert.equal(toCivilDateKey(afterActionCharge.dueDate), toCivilDateKey(beforeActionCharge.dueDate));
  assert.equal(afterActionCharge.paidAt, null);
  assert.equal(afterActionCharge.refundedAt, null);
  assert.equal(afterActionCharge.canceledAt, null);
  assert.equal(afterActionCharge.externalStatus, beforeActionCharge.externalStatus);
  assert.equal(afterActionCharge.collectionActions.length, 8);
  assert.equal(afterActionCharge.financialEvents.some((event) => event.action === "financial_charge.collection_contact"), true);
  assert.equal(afterActionCharge.financialEvents.some((event) => event.action === "financial_charge.collection_note"), true);
  assert.equal(afterActionCharge.financialEvents.some((event) => event.action === "financial_charge.collection_promise"), true);

  const promiseOverview = await getAdminDelinquencyOverview(professional.school.id, { bucket: "ATRASO_CRITICO" });
  const expiredPromiseRow = promiseOverview.rows.find((row) => row.charge.id === day16Charge.id);
  assert.ok(expiredPromiseRow);
  assert.equal(expiredPromiseRow.effectivePromiseStatus, "OVERDUE");
  assert.equal(isPaymentPromiseOverdue(expiredPromiseRow.latestPromise?.promisedDate, expiredPromiseRow.latestPromise?.promiseStatus, today), true);

  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: futureCharge.id,
        type: "NOTE",
        note: "Futura nao deve aceitar regua."
      }),
    (error) => error instanceof FinancialError && error.code === "status"
  );
  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: paidCharge.id,
        type: "NOTE",
        note: "Paga nao deve aceitar regua."
      }),
    (error) => error instanceof FinancialError && error.code === "status"
  );
  const otherSchoolChargeId = (await getAdminDelinquencyOverview(otherSchool.school.id)).rows[0].charge.id;
  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: otherSchoolChargeId,
        type: "NOTE",
        note: "Outro tenant."
      }),
    (error) => error instanceof FinancialError && error.code === "cobranca"
  );
  await assert.rejects(
    () => getAdminDelinquencyOverview(essential.school.id),
    (error) => error instanceof FinancialError && error.code === "plano"
  );

  const selectedFirstChildPortal = await getGuardianFinancialPortal(
    professional.school.id,
    professional.guardianUser.id,
    primaryStudent.student.id
  );
  assert.equal(selectedFirstChildPortal.selectedStudent?.id, primaryStudent.student.id);
  assert.equal(selectedFirstChildPortal.charges.every((charge) => charge.studentId === primaryStudent.student.id), true);
  assert.equal(selectedFirstChildPortal.charges.some((charge) => charge.studentId === secondStudent.student.id), false);

  const selectedSecondChildPortal = await getGuardianFinancialPortal(
    professional.school.id,
    professional.guardianUser.id,
    secondStudent.student.id
  );
  assert.equal(selectedSecondChildPortal.selectedStudent?.id, secondStudent.student.id);
  assert.equal(selectedSecondChildPortal.charges.length, 1);
  assert.equal(selectedSecondChildPortal.charges[0].studentId, secondStudent.student.id);

  const forgedStudentPortal = await getGuardianFinancialPortal(
    professional.school.id,
    professional.guardianUser.id,
    otherStudent.student.id
  );
  assert.notEqual(forgedStudentPortal.selectedStudent?.id, otherStudent.student.id);
  assert.equal(forgedStudentPortal.charges.every((charge) => charge.schoolId === professional.school.id), true);

  await cleanup();
}

function professionalIds(
  professional: Awaited<ReturnType<typeof createBaseSchool>>,
  studentFixture: Awaited<ReturnType<typeof createStudentWithEnrollment>>
) {
  return {
    schoolId: professional.school.id,
    studentId: studentFixture.student.id,
    guardianId: professional.guardian.id,
    enrollmentId: studentFixture.enrollment.id
  };
}

main()
  .then(() => {
    console.log("Delinquency homologation completed successfully. Temporary data cleaned up.");
  })
  .catch(async (error) => {
    await cleanup();
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
