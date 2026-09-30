import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import type { CollectionChannel } from "@prisma/client";
import {
  assertCollectionMessagePrivacy,
  collectionCommunicationTypes,
  generateCollectionCommunicationMessage,
  isRecentCommunication,
  suggestCollectionCommunicationType
} from "../src/lib/collection-communication";
import {
  dateFromCivilInput,
  getDaysOverdue,
  toCivilDateKey,
  todayCivilDate
} from "../src/lib/financial-core";
import { prisma } from "../src/lib/prisma";
import {
  FinancialError,
  getAdminDelinquencyOverview,
  registerCollectionAction
} from "../src/services/financial";

const root = process.cwd();
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260929110000_add_collection_communication_fields", "migration.sql"),
  "utf8"
);
const helperSource = readFileSync(join(root, "src", "lib", "collection-communication.ts"), "utf8");
const panelSource = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "collection-communication-panel.tsx"),
  "utf8"
);
const guardianFinancialPage = readFileSync(join(root, "src", "app", "responsavel", "financeiro", "page.tsx"), "utf8");

assert.match(migration, /ADD COLUMN "communicationType" TEXT/);
assert.match(migration, /ADD COLUMN "messageTemplate" TEXT/);
assert.match(migration, /ADD COLUMN "messageBody" TEXT/);
assert.doesNotMatch(migration, /DROP|DELETE|TRUNCATE|ALTER TABLE "Charge"/i);
assert.match(helperSource, /COLLECTION_COMMUNICATION_RECENT_WINDOW_HOURS = 24/);
assert.match(panelSource, /navigator\.clipboard\.writeText/);
assert.match(panelSource, /Registrar comunicacao/);
assert.doesNotMatch(guardianFinancialPage, /CollectionAction|messageBody|communicationType|tentativa|contato recente/i);

const slugPrefix = "homologacao-comunicacao-cobranca-";

function addCivilDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const normalized = dateFromCivilInput(toCivilDateKey(next));
  assert.ok(normalized);
  return normalized;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function cleanup() {
  await prisma.school.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
}

async function createFixture(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string) {
  const today = todayCivilDate();
  const school = await prisma.school.create({
    data: {
      name: `Homologacao Comunicacao ${suffix}`,
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
  const year = await prisma.academicYear.create({
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
      academicYearId: year.id,
      name: `Turma ${suffix}`,
      gradeLevel: "8 Ano",
      shift: "MATUTINO"
    }
  });
  const guardian = await prisma.guardian.create({
    data: {
      schoolId: school.id,
      fullName: `Responsavel ${suffix}`,
      cpf: "98765432100",
      relation: "Responsavel",
      phone: "(11) 97777-0000",
      email: `responsavel-${suffix}@homologacao.local`
    }
  });
  const otherStudent = await prisma.student.create({
    data: {
      schoolId: school.id,
      fullName: `Outro aluno ${suffix}`,
      guardians: { create: { guardianId: guardian.id, isPrimary: false } }
    }
  });
  const student = await prisma.student.create({
    data: {
      schoolId: school.id,
      fullName: `Aluno ${suffix}`,
      address: "Rua interna que nao pode aparecer",
      guardians: { create: { guardianId: guardian.id, isPrimary: true } }
    }
  });
  const enrollment = await prisma.enrollment.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      classroomId: classroom.id,
      academicYearId: year.id,
      registration: `HOM-${suffix}`,
      enrolledAt: dateFromCivilInput("2026-01-20")!
    }
  });
  const overdueCharge = await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade homologacao",
      description: "Homologacao local de comunicacao controlada",
      amount: new Prisma.Decimal("149.90"),
      dueDate: addCivilDays(today, -12),
      status: "PENDING",
      competence: "2026-09",
      externalStatus: "PENDING",
      externalPaymentId: `pay-hom-${suffix}`
    }
  });
  const futureCharge = await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade futura",
      amount: new Prisma.Decimal("149.90"),
      dueDate: addCivilDays(today, 5),
      status: "PENDING",
      competence: "2026-10"
    }
  });

  return { school, admin, classroom, guardian, student, otherStudent, overdueCharge, futureCharge };
}

function assertSafeMessage(message: string, fixture: Awaited<ReturnType<typeof createFixture>>) {
  assert.equal(message.includes(fixture.guardian.fullName), true);
  assert.equal(message.includes(fixture.student.fullName), true);
  assert.equal(message.includes(fixture.otherStudent.fullName), false);
  assert.equal(message.includes(fixture.guardian.cpf!), false);
  assert.equal(message.includes(fixture.student.address!), false);
  assert.equal(/\{[a-z_]+\}/i.test(message), false);
  assert.equal(assertCollectionMessagePrivacy(message), true);
  assert.doesNotMatch(message, /nota|frequencia|saude|devedor|inadimplente|serasa|protesto|juros|multa/i);
}

async function main() {
  await cleanup();
  const professional = await createFixture("PROFISSIONAL", "profissional");
  const essential = await createFixture("ESSENCIAL", "essencial");
  const daysOverdue = getDaysOverdue(professional.overdueCharge.dueDate);

  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 3 }), "ATRASO_LEVE");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue }), "ATRASO_MODERADO");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 20 }), "ATRASO_CRITICO");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 0 }), "LEMBRETE_VENCIMENTO");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue, promiseStatus: "OPEN", promisedDate: addCivilDays(todayCivilDate(), 2) }), "PROMESSA_PROXIMA");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue, promiseStatus: "OVERDUE", promisedDate: addCivilDays(todayCivilDate(), -1) }), "PROMESSA_VENCIDA");

  for (const type of collectionCommunicationTypes) {
    const generated = generateCollectionCommunicationMessage(
      {
        guardianName: professional.guardian.fullName,
        studentName: professional.student.fullName,
        schoolName: professional.school.name,
        competence: professional.overdueCharge.competence,
        amount: professional.overdueCharge.amount,
        dueDate: type === "LEMBRETE_VENCIMENTO" ? professional.futureCharge.dueDate : professional.overdueCharge.dueDate,
        daysOverdue: type === "LEMBRETE_VENCIMENTO" ? 0 : daysOverdue,
        promisedDate: addCivilDays(todayCivilDate(), type === "PROMESSA_VENCIDA" ? -1 : 2),
        promiseStatus: type === "PROMESSA_VENCIDA" ? "OVERDUE" : "OPEN"
      },
      type
    );
    assertSafeMessage(generated.body, professional);
    if (type === "LEMBRETE_VENCIMENTO") assert.doesNotMatch(generated.body, /atras|pendente ha/i);
  }

  await assert.rejects(
    () => getAdminDelinquencyOverview(essential.school.id),
    (error) => error instanceof FinancialError && error.code === "plano"
  );

  const beforePreviewActions = await prisma.collectionAction.count({ where: { schoolId: professional.school.id } });
  const overview = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(overview.rows.length, 1);
  assert.equal(await prisma.collectionAction.count({ where: { schoolId: professional.school.id } }), beforePreviewActions);
  assert.equal(overview.rows[0].generatedCommunication.type, "ATRASO_MODERADO");
  assert.equal(overview.rows[0].generatedCommunication.body.includes(professional.school.name), true);

  const beforeCharge = await prisma.charge.findUniqueOrThrow({ where: { id: professional.overdueCharge.id } });
  const channels: CollectionChannel[] = ["WHATSAPP", "EMAIL", "PHONE", "IN_PERSON", "OTHER"];
  const createdActionIds: string[] = [];
  for (const channel of channels) {
    const messageBody = `${overview.rows[0].generatedCommunication.body}\n\nRevisado para canal ${channel}.`;
    const actionId = await registerCollectionAction(professional.school.id, professional.admin.id, {
      chargeId: professional.overdueCharge.id,
      type: "CONTACT",
      channel,
      communicationType: overview.rows[0].generatedCommunication.type,
      messageTemplate: overview.rows[0].generatedCommunication.templateId,
      messageBody,
      note: `Homologacao manual via ${channel}.`
    });
    createdActionIds.push(actionId);
    const action = await prisma.collectionAction.findUniqueOrThrow({ where: { id: actionId } });
    assert.equal(action.channel, channel);
    assert.equal(action.createdById, professional.admin.id);
    assert.equal(action.messageBody, messageBody);
    assert.equal(action.schoolId, professional.school.id);
  }

  const afterRegister = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(afterRegister.rows[0].recentCommunication?.id, createdActionIds.at(-1));

  const now = new Date("2026-09-29T12:00:00.000Z");
  assert.equal(isRecentCommunication(addHours(now, -23.99), now), true);
  assert.equal(isRecentCommunication(addHours(now, -24), now), true);
  assert.equal(isRecentCommunication(addHours(now, -24.01), now), false);

  await prisma.collectionAction.update({
    where: { id: createdActionIds[0] },
    data: { createdAt: addHours(new Date(), -25) }
  });
  assert.equal((await getAdminDelinquencyOverview(professional.school.id)).rows[0].recentCommunication?.id !== createdActionIds[0], true);

  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: essential.overdueCharge.id,
        type: "CONTACT",
        channel: "EMAIL",
        communicationType: "ATRASO_MODERADO",
        messageBody: "Tentativa de outro tenant."
      }),
    (error) => error instanceof FinancialError && error.code === "cobranca"
  );

  const afterCharge = await prisma.charge.findUniqueOrThrow({ where: { id: professional.overdueCharge.id } });
  assert.equal(afterCharge.status, beforeCharge.status);
  assert.equal(afterCharge.amount.toString(), beforeCharge.amount.toString());
  assert.equal(toCivilDateKey(afterCharge.dueDate), toCivilDateKey(beforeCharge.dueDate));
  assert.equal(afterCharge.paidAt, beforeCharge.paidAt);
  assert.equal(afterCharge.canceledAt, beforeCharge.canceledAt);
  assert.equal(afterCharge.refundedAt, beforeCharge.refundedAt);
  assert.equal(afterCharge.externalStatus, beforeCharge.externalStatus);
  assert.equal(afterCharge.externalPaymentId, beforeCharge.externalPaymentId);

  const financialEvents = await prisma.chargeFinancialEvent.findMany({
    where: { chargeId: professional.overdueCharge.id },
    orderBy: { createdAt: "desc" }
  });
  assert.equal(financialEvents.every((event) => event.action === "financial_charge.collection_contact"), true);
  assert.equal(financialEvents.some((event) => event.nextStatus || event.previousStatus), false);

  await cleanup();
  assert.equal(await prisma.school.count({ where: { slug: { startsWith: slugPrefix } } }), 0);
}

main()
  .then(() => {
    console.log("Collection communications homologated successfully.");
  })
  .catch(async (error) => {
    await cleanup();
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
