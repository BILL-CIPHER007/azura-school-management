import assert from "node:assert/strict";
import { GET } from "../src/app/api/internal/billing/run-recurring/route";
import {
  dateFromCivilInput,
  dueDateFromBillingCompetence,
  getBillingAutomationCompetence,
  getBillingAutomationDateParts,
  getNextBillingAutomationRunAt,
  shouldRunBillingAutomationRule,
  toCivilDateKey
} from "../src/lib/financial-core";
import { prisma } from "../src/lib/prisma";
import { runRecurringBillingAutomation } from "../src/services/financial";

const runId = `homologacao-bloco6-${Date.now()}`;
const now = new Date();
const todayParts = getBillingAutomationDateParts(now);
const currentCompetence = getBillingAutomationCompetence(now);
const currentYear = todayParts.year;
const today = todayParts.day;
const wrongDay = today === 28 ? 27 : today + 1;

function requiredCivilDate(value: string) {
  const parsed = dateFromCivilInput(value);
  if (!parsed) throw new Error(`Data civil invalida: ${value}`);
  return parsed;
}

const startsOn = requiredCivilDate(`${currentYear}-01-01`);
const endsOn = requiredCivilDate(`${currentYear}-12-31`);

async function cleanup() {
  const schools = await prisma.school.findMany({
    where: { slug: { startsWith: runId } },
    select: { id: true }
  });
  const schoolIds = schools.map((school) => school.id);
  if (!schoolIds.length) return;

  const [guardians, students] = await Promise.all([
    prisma.guardian.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } }),
    prisma.student.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } })
  ]);
  const guardianIds = guardians.map((guardian) => guardian.id);
  const studentIds = students.map((student) => student.id);

  await prisma.chargeFinancialEvent.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.billingAutomationRun.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.charge.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.billingBatch.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.billingRule.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.enrollment.deleteMany({ where: { schoolId: { in: schoolIds } } });
  if (guardianIds.length || studentIds.length) {
    await prisma.guardianStudent.deleteMany({
      where: {
        OR: [{ guardianId: { in: guardianIds } }, { studentId: { in: studentIds } }]
      }
    });
  }
  await prisma.guardianExternalCustomer.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.student.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.guardian.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.classroom.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.academicPeriod.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.academicYear.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
}

async function createSchoolFixture(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string) {
  const school = await prisma.school.create({
    data: {
      name: `Homologacao ${suffix}`,
      slug: `${runId}-${suffix.toLowerCase()}`,
      plan
    }
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      year: currentYear,
      startsAt: startsOn,
      endsAt: endsOn,
      isActive: true
    }
  });

  const [classA, classB] = await Promise.all([
    prisma.classroom.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "Turma Homologacao A",
        gradeLevel: "6 Ano",
        shift: "MATUTINO"
      }
    }),
    prisma.classroom.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "Turma Homologacao B",
        gradeLevel: "7 Ano",
        shift: "VESPERTINO"
      }
    })
  ]);

  const guardian = await prisma.guardian.create({
    data: {
      schoolId: school.id,
      fullName: `Responsavel ${suffix}`,
      cpf: "39053344705",
      relation: "Responsavel",
      email: `${suffix.toLowerCase()}-${runId}@homologacao.local`
    }
  });

  async function createStudent(index: number, classroomId: string, status: "ACTIVE" | "CANCELLED" = "ACTIVE") {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        fullName: `Aluno ${suffix} ${index}`,
        guardians: {
          create: {
            guardianId: guardian.id,
            isPrimary: true
          }
        }
      }
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        classroomId,
        academicYearId: academicYear.id,
        registration: `${suffix}-${index}-${runId}`.slice(0, 64),
        enrolledAt: startsOn,
        status
      }
    });

    return { student, enrollment };
  }

  const students = [
    await createStudent(1, classA.id),
    await createStudent(2, classA.id),
    await createStudent(3, classB.id),
    await createStudent(4, classA.id, "CANCELLED")
  ];

  return { school, academicYear, classA, classB, guardian, students };
}

async function createRule(input: {
  schoolId: string;
  name: string;
  amount?: string;
  dueDay?: number;
  generationDay?: number;
  isActive?: boolean;
  autoGenerate?: boolean;
  classroomId?: string | null;
  startsOn?: Date | null;
  endsOn?: Date | null;
}) {
  return prisma.billingRule.create({
    data: {
      schoolId: input.schoolId,
      name: input.name,
      amount: input.amount ?? "150.00",
      dueDay: input.dueDay ?? 10,
      generationDay: input.generationDay ?? today,
      isActive: input.isActive ?? true,
      autoGenerate: input.autoGenerate ?? true,
      targetScope: input.classroomId ? "CLASSROOM" : "SCHOOL",
      classroomId: input.classroomId ?? null,
      startsOn: input.startsOn ?? startsOn,
      endsOn: input.endsOn ?? endsOn,
      nextGenerationAt: getNextBillingAutomationRunAt({
        isActive: input.isActive ?? true,
        autoGenerate: input.autoGenerate ?? true,
        generationDay: input.generationDay ?? today,
        dueDay: input.dueDay ?? 10,
        startsOn: input.startsOn ?? startsOn,
        endsOn: input.endsOn ?? endsOn
      })
    }
  });
}

async function countRuleCharges(schoolId: string, billingRuleId: string) {
  return prisma.charge.count({ where: { schoolId, billingRuleId, competence: currentCompetence } });
}

async function countRuleBatches(schoolId: string, billingRuleId: string) {
  return prisma.billingBatch.count({ where: { schoolId, billingRuleId, competence: currentCompetence } });
}

async function main() {
  await cleanup();

  const professional = await createSchoolFixture("PROFISSIONAL", "profissional");
  const essential = await createSchoolFixture("ESSENCIAL", "essencial");

  const validRule = await createRule({ schoolId: professional.school.id, name: "Mensalidade valida" });
  const wrongDayRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade fora do dia",
    generationDay: wrongDay
  });
  const inactiveRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade inativa",
    isActive: false
  });
  const automationOffRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade automacao off",
    autoGenerate: false
  });
  const classroomRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade por turma",
    classroomId: professional.classA.id,
    amount: "175.00",
    dueDay: 12
  });
  const futureRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade vigencia futura",
    startsOn: requiredCivilDate(`${currentYear}-12-01`),
    endsOn
  });
  const essentialRule = await createRule({
    schoolId: essential.school.id,
    name: "Mensalidade essencial"
  });

  assert.equal(shouldRunBillingAutomationRule(validRule, now), true);
  assert.equal(shouldRunBillingAutomationRule(wrongDayRule, now), false);
  assert.equal(shouldRunBillingAutomationRule(inactiveRule, now), false);
  assert.equal(shouldRunBillingAutomationRule(automationOffRule, now), false);
  assert.equal(getBillingAutomationCompetence(new Date("2026-09-10T02:30:00.000Z")), "2026-09");
  assert.equal(getBillingAutomationCompetence(new Date("2026-12-31T23:30:00.000Z")), "2026-12");
  assert.equal(getBillingAutomationCompetence(new Date("2027-01-01T03:30:00.000Z")), "2027-01");

  const cronResult = await runRecurringBillingAutomation({ now, trigger: "CRON" });
  const validItem = cronResult.items.find((item) => item.billingRuleId === validRule.id);
  const wrongDayItem = cronResult.items.find((item) => item.billingRuleId === wrongDayRule.id);
  const classroomItem = cronResult.items.find((item) => item.billingRuleId === classroomRule.id);
  const futureItem = cronResult.items.find((item) => item.billingRuleId === futureRule.id);

  assert.equal(validItem?.status, "SUCCESS");
  assert.equal(validItem?.generatedCharges, 3);
  assert.equal(classroomItem?.status, "SUCCESS");
  assert.equal(classroomItem?.generatedCharges, 2);
  assert.equal(wrongDayItem?.status, "SKIPPED");
  assert.equal(futureItem?.status, "SKIPPED");
  assert.equal(cronResult.items.some((item) => item.billingRuleId === inactiveRule.id), false);
  assert.equal(cronResult.items.some((item) => item.billingRuleId === automationOffRule.id), false);
  assert.equal(cronResult.items.some((item) => item.billingRuleId === essentialRule.id), false);
  assert.equal(await countRuleCharges(essential.school.id, essentialRule.id), 0);

  const validRuleAfterRun = await prisma.billingRule.findUniqueOrThrow({ where: { id: validRule.id } });
  assert.equal(validRuleAfterRun.lastGeneratedCompetence, currentCompetence);
  assert.ok(validRuleAfterRun.nextGenerationAt);

  const originalCharges = await prisma.charge.findMany({
    where: { schoolId: professional.school.id, billingRuleId: validRule.id, competence: currentCompetence },
    select: { amount: true, dueDate: true, provider: true, externalPaymentId: true, billingType: true }
  });
  assert.equal(originalCharges.length, 3);
  assert.ok(originalCharges.every((charge) => charge.amount.toString() === "150"));
  assert.ok(originalCharges.every((charge) => toCivilDateKey(charge.dueDate) === toCivilDateKey(dueDateFromBillingCompetence(currentCompetence, 10)!)));
  assert.ok(originalCharges.every((charge) => !charge.provider && !charge.externalPaymentId && !charge.billingType));

  await prisma.billingRule.update({
    where: { id: validRule.id },
    data: { amount: "199.00", dueDay: 20 }
  });
  const frozenCharges = await prisma.charge.findMany({
    where: { schoolId: professional.school.id, billingRuleId: validRule.id, competence: currentCompetence },
    select: { amount: true, dueDate: true }
  });
  assert.ok(frozenCharges.every((charge) => charge.amount.toString() === "150"));
  assert.ok(frozenCharges.every((charge) => toCivilDateKey(charge.dueDate) === toCivilDateKey(dueDateFromBillingCompetence(currentCompetence, 10)!)));

  const secondRun = await runRecurringBillingAutomation({ now, trigger: "CRON" });
  const secondValidItem = secondRun.items.find((item) => item.billingRuleId === validRule.id);
  assert.equal(secondValidItem?.status, "SKIPPED");
  assert.equal(secondValidItem?.generatedCharges, 0);
  assert.equal(await countRuleBatches(professional.school.id, validRule.id), 1);
  assert.equal(await countRuleCharges(professional.school.id, validRule.id), 3);

  const concurrentRule = await createRule({
    schoolId: professional.school.id,
    name: "Mensalidade concorrente",
    amount: "210.00"
  });
  await Promise.all([
    runRecurringBillingAutomation({
      schoolId: professional.school.id,
      billingRuleId: concurrentRule.id,
      trigger: "MANUAL",
      bypassSchedule: true
    }),
    runRecurringBillingAutomation({
      schoolId: professional.school.id,
      billingRuleId: concurrentRule.id,
      trigger: "MANUAL",
      bypassSchedule: true
    })
  ]);
  assert.equal(await countRuleBatches(professional.school.id, concurrentRule.id), 1);
  assert.equal(await countRuleCharges(professional.school.id, concurrentRule.id), 3);

  const failureRun = await runRecurringBillingAutomation({
    schoolId: professional.school.id,
    billingRuleId: futureRule.id,
    trigger: "MANUAL",
    bypassSchedule: true
  });
  const failedItem = failureRun.items.find((item) => item.billingRuleId === futureRule.id);
  assert.equal(failedItem?.status, "FAILED");
  assert.ok(failedItem?.errorMessage);

  process.env.BILLING_CRON_SECRET = "homologacao-local-secret";
  const unauthorizedResponse = await GET(new Request("http://localhost/api/internal/billing/run-recurring"));
  assert.equal(unauthorizedResponse.status, 401);
  const authorizedResponse = await GET(
    new Request("http://localhost/api/internal/billing/run-recurring", {
      headers: { authorization: "Bearer homologacao-local-secret" }
    })
  );
  assert.ok(authorizedResponse.status >= 200 && authorizedResponse.status < 300);
  const authorizedBody = await authorizedResponse.text();
  assert.equal(authorizedBody.includes("homologacao-local-secret"), false);
  assert.equal(authorizedBody.includes("schoolId"), false);

  const logs = await prisma.billingAutomationRun.findMany({
    where: { schoolId: professional.school.id },
    orderBy: { createdAt: "desc" }
  });
  assert.ok(logs.some((log) => log.status === "SUCCESS" && log.trigger === "CRON"));
  assert.ok(logs.some((log) => log.status === "SKIPPED" && log.trigger === "CRON"));
  assert.ok(logs.some((log) => log.status === "FAILED" && log.trigger === "MANUAL"));
  assert.ok(logs.every((log) => log.competence === currentCompetence));
  assert.ok(logs.every((log) => log.schoolId === professional.school.id));
  assert.ok(logs.every((log) => !log.errorMessage || !log.errorMessage.includes("secret")));

  const asaasCustomers = await prisma.guardianExternalCustomer.count({
    where: { schoolId: professional.school.id }
  });
  assert.equal(asaasCustomers, 0);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        competence: currentCompetence,
        timezone: "America/Sao_Paulo",
        cronUtc: "0 9 * * *",
        cronBrazil: "06:00 no horario de Brasilia",
        success: logs.filter((log) => log.status === "SUCCESS").length,
        skipped: logs.filter((log) => log.status === "SKIPPED").length,
        failed: logs.filter((log) => log.status === "FAILED").length,
        validRuleCharges: await countRuleCharges(professional.school.id, validRule.id),
        classroomRuleCharges: await countRuleCharges(professional.school.id, classroomRule.id),
        concurrentRuleCharges: await countRuleCharges(professional.school.id, concurrentRule.id),
        essentialRuleCharges: await countRuleCharges(essential.school.id, essentialRule.id)
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
