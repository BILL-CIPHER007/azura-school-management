import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import {
  assertCollectionMessagePrivacy,
  collectionCommunicationTypes,
  generateCollectionCommunicationMessage,
  getRecentCommunicationCutoff,
  isCollectionCommunicationType,
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
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260929110000_add_collection_communication_fields", "migration.sql"),
  "utf8"
);
const adminDelinquencyPage = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "page.tsx"),
  "utf8"
);
const communicationPanel = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "collection-communication-panel.tsx"),
  "utf8"
);
const communicationHelper = readFileSync(join(root, "src", "lib", "collection-communication.ts"), "utf8");
const guardianFinancialPage = readFileSync(
  join(root, "src", "app", "responsavel", "financeiro", "page.tsx"),
  "utf8"
);

assert.match(schema, /communicationType\s+String\?/);
assert.match(schema, /messageTemplate\s+String\?/);
assert.match(schema, /messageBody\s+String\?/);
assert.match(migration, /ADD COLUMN "communicationType" TEXT/);
assert.match(migration, /ADD COLUMN "messageTemplate" TEXT/);
assert.match(migration, /ADD COLUMN "messageBody" TEXT/);
assert.doesNotMatch(migration, /ALTER TABLE "Charge"/);
assert.match(adminDelinquencyPage, /CollectionCommunicationPanel/);
assert.match(communicationPanel, /Preparar mensagem/);
assert.match(communicationPanel, /navigator\.clipboard\.writeText/);
assert.match(communicationPanel, /Registrar comunicacao/);
assert.match(communicationHelper, /generateCollectionCommunicationMessage/);
assert.doesNotMatch(guardianFinancialPage, /CollectionAction|messageBody|communicationType|Promessa vencida|Acompanhamento prioritario/);

function addCivilDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const normalized = dateFromCivilInput(toCivilDateKey(next));
  assert.ok(normalized);
  return normalized;
}

const slugPrefix = "validacao-comunicacao-cobranca-";

async function cleanup() {
  await prisma.school.deleteMany({
    where: { slug: { startsWith: slugPrefix } }
  });
}

async function createSchoolFixture(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string) {
  const today = todayCivilDate();
  const school = await prisma.school.create({
    data: {
      name: `Validacao Comunicacao ${suffix}`,
      slug: `${slugPrefix}${suffix}`,
      plan
    }
  });
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Admin ${suffix}`,
      email: `admin-comunicacao-${suffix}@validacao.local`,
      passwordHash: "hash",
      role: "ADMIN"
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
      name: `Turma ${suffix}`,
      gradeLevel: "7 Ano",
      shift: "MATUTINO"
    }
  });
  const guardian = await prisma.guardian.create({
    data: {
      schoolId: school.id,
      fullName: `Responsavel ${suffix}`,
      cpf: "12345678901",
      relation: "Responsavel",
      phone: "(11) 98888-0000",
      email: `familia-${suffix}@validacao.local`
    }
  });
  const student = await prisma.student.create({
    data: {
      schoolId: school.id,
      fullName: `Aluno ${suffix}`,
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
      classroomId: classroom.id,
      academicYearId: academicYear.id,
      registration: `COM-${suffix}`,
      enrolledAt: dateFromCivilInput("2026-01-20")!
    }
  });
  const charge = await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade validacao",
      description: "Validacao local de comunicacao controlada",
      amount: new Prisma.Decimal("135.70"),
      dueDate: addCivilDays(today, -12),
      status: "PENDING",
      competence: "2026-09"
    }
  });

  return { school, admin, classroom, guardian, student, charge };
}

function assertMessageSafe(message: string, fixture: Awaited<ReturnType<typeof createSchoolFixture>>) {
  assert.equal(message.includes(fixture.guardian.fullName), true);
  assert.equal(message.includes(fixture.student.fullName), true);
  assert.equal(message.includes("09/2026"), true);
  assert.equal(/\{[a-z_]+\}/i.test(message), false);
  assert.equal(message.includes(fixture.guardian.cpf!), false);
  assert.equal(assertCollectionMessagePrivacy(message), true);
}

async function main() {
  await cleanup();
  const professional = await createSchoolFixture("PROFISSIONAL", "profissional");
  const essential = await createSchoolFixture("ESSENCIAL", "essencial");

  assert.equal(isCollectionCommunicationType("ATRASO_LEVE"), true);
  assert.equal(isCollectionCommunicationType("OUTRO_TIPO"), false);
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 3 }), "ATRASO_LEVE");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 12 }), "ATRASO_MODERADO");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 20 }), "ATRASO_CRITICO");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 12, promiseStatus: "OPEN", promisedDate: addCivilDays(todayCivilDate(), 2) }), "PROMESSA_PROXIMA");
  assert.equal(suggestCollectionCommunicationType({ daysOverdue: 12, promiseStatus: "OVERDUE", promisedDate: addCivilDays(todayCivilDate(), -1) }), "PROMESSA_VENCIDA");

  const daysOverdue = getDaysOverdue(professional.charge.dueDate);
  for (const type of collectionCommunicationTypes) {
    const generated = generateCollectionCommunicationMessage(
      {
        guardianName: professional.guardian.fullName,
        studentName: professional.student.fullName,
        schoolName: professional.school.name,
        competence: professional.charge.competence,
        amount: professional.charge.amount,
        dueDate: professional.charge.dueDate,
        daysOverdue,
        promisedDate: addCivilDays(todayCivilDate(), 2),
        promiseStatus: "OPEN"
      },
      type
    );
    assertMessageSafe(generated.body, professional);
  }
  const moderateTemplate = generateCollectionCommunicationMessage(
    {
      guardianName: professional.guardian.fullName,
      studentName: professional.student.fullName,
      schoolName: professional.school.name,
      competence: professional.charge.competence,
      amount: professional.charge.amount,
      dueDate: professional.charge.dueDate,
      daysOverdue
    },
    "ATRASO_MODERADO"
  );
  assert.equal(moderateTemplate.body.includes("R$"), true);
  assert.equal(moderateTemplate.body.includes(String(daysOverdue)), true);
  assert.equal(moderateTemplate.body.includes(professional.school.name), true);

  await assert.rejects(
    () => getAdminDelinquencyOverview(essential.school.id),
    (error) => error instanceof FinancialError && error.code === "plano"
  );

  const beforeCopyCount = await prisma.collectionAction.count({ where: { schoolId: professional.school.id } });
  generateCollectionCommunicationMessage({
    guardianName: professional.guardian.fullName,
    studentName: professional.student.fullName,
    schoolName: professional.school.name,
    competence: professional.charge.competence,
    amount: professional.charge.amount,
    dueDate: professional.charge.dueDate,
    daysOverdue
  });
  assert.equal(await prisma.collectionAction.count({ where: { schoolId: professional.school.id } }), beforeCopyCount);

  const overview = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(overview.rows.length, 1);
  assert.equal(overview.rows[0].generatedCommunication.type, "ATRASO_MODERADO");
  assert.equal(overview.rows[0].recentCommunication, null);
  assert.equal(overview.rows[0].charge.guardian?.email, professional.guardian.email);
  assert.equal(overview.rows[0].charge.guardian?.phone, professional.guardian.phone);

  const generated = overview.rows[0].generatedCommunication;
  const beforeCharge = await prisma.charge.findUniqueOrThrow({ where: { id: professional.charge.id } });
  const actionId = await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: professional.charge.id,
    type: "CONTACT",
    channel: "WHATSAPP",
    communicationType: generated.type,
    messageTemplate: generated.templateId,
    messageBody: generated.body,
    note: "Contato manual registrado pela validacao."
  });
  assert.ok(actionId);

  const action = await prisma.collectionAction.findUniqueOrThrow({ where: { id: actionId } });
  assert.equal(action.schoolId, professional.school.id);
  assert.equal(action.chargeId, professional.charge.id);
  assert.equal(action.type, "CONTACT");
  assert.equal(action.channel, "WHATSAPP");
  assert.equal(action.communicationType, "ATRASO_MODERADO");
  assert.equal(action.messageTemplate, "ATRASO_MODERADO");
  assert.equal(action.messageBody, generated.body);

  const afterCharge = await prisma.charge.findUniqueOrThrow({ where: { id: professional.charge.id } });
  assert.equal(afterCharge.status, beforeCharge.status);
  assert.equal(afterCharge.amount.toString(), beforeCharge.amount.toString());
  assert.equal(toCivilDateKey(afterCharge.dueDate), toCivilDateKey(beforeCharge.dueDate));

  const withRecent = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(withRecent.rows[0].recentCommunication?.id, actionId);

  await prisma.collectionAction.update({
    where: { id: actionId },
    data: { createdAt: addCivilDays(getRecentCommunicationCutoff(), -1) }
  });
  const afterOldContact = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(afterOldContact.rows[0].recentCommunication, null);

  await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: professional.charge.id,
    type: "PAYMENT_PROMISE",
    promisedDate: toCivilDateKey(addCivilDays(todayCivilDate(), 3)),
    note: "Promessa preservada."
  });
  const withPromise = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(withPromise.rows[0].generatedCommunication.type, "PROMESSA_PROXIMA");

  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: essential.charge.id,
        type: "CONTACT",
        channel: "EMAIL",
        communicationType: "ATRASO_LEVE",
        messageBody: "Nao deve registrar contato de outro tenant."
      }),
    (error) => error instanceof FinancialError && error.code === "cobranca"
  );

  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: professional.charge.id,
        type: "CONTACT",
        channel: "EMAIL",
        communicationType: "ATRASO_LEVE",
        messageBody: "CPF 123.456.789-01 nao deve aparecer."
      }),
    (error) => error instanceof FinancialError && error.code === "mensagem"
  );

  await cleanup();
}

main()
  .then(() => {
    console.log("Collection communications validated successfully.");
  })
  .catch(async (error) => {
    await cleanup();
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
