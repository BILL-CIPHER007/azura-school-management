import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import {
  dateFromCivilInput,
  getCollectionRecommendation,
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
  registerCollectionAction
} from "../src/services/financial";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260911110000_add_collection_actions", "migration.sql"),
  "utf8"
);
const adminDelinquencyPage = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "page.tsx"),
  "utf8"
);
const collectionCommunicationPanel = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "collection-communication-panel.tsx"),
  "utf8"
);
const guardianFinancialPage = readFileSync(
  join(root, "src", "app", "responsavel", "financeiro", "page.tsx"),
  "utf8"
);

function addCivilDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const normalized = dateFromCivilInput(toCivilDateKey(next));
  assert.ok(normalized);
  return normalized;
}

assert.match(schema, /enum CollectionActionType/);
assert.match(schema, /enum CollectionChannel/);
assert.match(schema, /enum PaymentPromiseStatus/);
assert.match(schema, /model CollectionAction/);
assert.match(schema, /collectionActions\s+CollectionAction\[\]/);

assert.match(migration, /CREATE TYPE "CollectionActionType"/);
assert.match(migration, /CREATE TYPE "CollectionChannel"/);
assert.match(migration, /CREATE TABLE "CollectionAction"/);
assert.match(migration, /REFERENCES "Charge"\("id"\) ON DELETE CASCADE/);
assert.doesNotMatch(migration, /ALTER TABLE "Charge" ADD COLUMN/);

assert.match(adminDelinquencyPage, /Lista de inadimplentes/);
assert.match(adminDelinquencyPage, /CollectionCommunicationPanel/);
assert.match(collectionCommunicationPanel, /Preparar mensagem/);
assert.match(adminDelinquencyPage, /Registrar promessa/);
assert.doesNotMatch(guardianFinancialPage, /ATRASO_CRITICO|ATRASO_MODERADO|ATRASO_LEVE/);

const now = new Date("2026-09-11T12:00:00.000Z");
assert.equal(getDaysOverdue(new Date("2026-09-10T12:00:00.000Z"), now), 1);
assert.equal(getDaysOverdue(new Date("2026-09-11T12:00:00.000Z"), now), 0);
assert.equal(isChargeDelinquent("PENDING", new Date("2026-09-10T12:00:00.000Z"), now), true);
assert.equal(isChargeDelinquent("PAID", new Date("2026-09-10T12:00:00.000Z"), now), false);
assert.equal(isChargeDelinquent("CANCELED", new Date("2026-09-10T12:00:00.000Z"), now), false);
assert.equal(isChargeDelinquent("REFUNDED", new Date("2026-09-10T12:00:00.000Z"), now), false);
assert.equal(getDelinquencyBucket(0), "EM_DIA");
assert.equal(getDelinquencyBucket(1), "ATRASO_LEVE");
assert.equal(getDelinquencyBucket(5), "ATRASO_LEVE");
assert.equal(getDelinquencyBucket(6), "ATRASO_MODERADO");
assert.equal(getDelinquencyBucket(15), "ATRASO_MODERADO");
assert.equal(getDelinquencyBucket(16), "ATRASO_CRITICO");
assert.equal(getCollectionRecommendation(2), "LEMBRAR");
assert.equal(getCollectionRecommendation(10), "REFORCAR_CONTATO");
assert.equal(getCollectionRecommendation(20), "ATENCAO_PRIORITARIA");
assert.equal(isPaymentPromiseOverdue(new Date("2026-09-10T12:00:00.000Z"), "OPEN", now), true);
assert.equal(isPaymentPromiseOverdue(new Date("2026-09-10T12:00:00.000Z"), "FULFILLED", now), false);

const slugPrefix = "validacao-inadimplencia-";

async function cleanup() {
  await prisma.school.deleteMany({
    where: { slug: { startsWith: slugPrefix } }
  });
}

async function createSchoolFixture(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string) {
  const today = todayCivilDate();
  const school = await prisma.school.create({
    data: {
      name: `Validacao Inadimplencia ${suffix}`,
      slug: `${slugPrefix}${suffix}`,
      plan
    }
  });
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Admin ${suffix}`,
      email: `admin-${suffix}@validacao.local`,
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
      gradeLevel: "6 Ano",
      shift: "MATUTINO"
    }
  });
  const guardian = await prisma.guardian.create({
    data: {
      schoolId: school.id,
      fullName: `Responsavel ${suffix}`,
      cpf: "12345678901",
      relation: "Responsavel",
      phone: "(11) 99999-0000",
      email: `responsavel-${suffix}@validacao.local`
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
      registration: `VAL-${suffix}`,
      enrolledAt: dateFromCivilInput("2026-01-20")!
    }
  });
  const overdueCharge = await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade vencida",
      description: "Validacao local de inadimplencia",
      amount: new Prisma.Decimal("100.00"),
      dueDate: addCivilDays(today, -10),
      status: "PENDING",
      competence: "2026-09"
    }
  });
  await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade futura",
      amount: new Prisma.Decimal("90.00"),
      dueDate: addCivilDays(today, 10),
      status: "PENDING",
      competence: "2026-10"
    }
  });

  return { school, admin, classroom, guardian, student, overdueCharge };
}

async function main() {
  await cleanup();
  const professional = await createSchoolFixture("PROFISSIONAL", "profissional");
  const essential = await createSchoolFixture("ESSENCIAL", "essencial");

  await assert.rejects(
    () => getAdminDelinquencyOverview(essential.school.id),
    (error) => error instanceof FinancialError && error.code === "plano"
  );

  const overview = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(overview.rows.length, 1);
  assert.equal(overview.summary.overdueCount, 1);
  assert.equal(overview.summary.delinquentGuardians, 1);
  assert.equal(overview.rows[0].charge.schoolId, professional.school.id);
  assert.equal(overview.rows[0].bucket, "ATRASO_MODERADO");

  const filteredByOtherSchoolClass = await getAdminDelinquencyOverview(professional.school.id, {
    classroomId: essential.classroom.id
  });
  assert.equal(filteredByOtherSchoolClass.rows.length, 0);

  const actionId = await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: professional.overdueCharge.id,
    type: "CONTACT",
    channel: "WHATSAPP",
    note: "Contato validado localmente."
  });
  assert.ok(actionId);

  const promiseId = await registerCollectionAction(professional.school.id, professional.admin.id, {
    chargeId: professional.overdueCharge.id,
    type: "PAYMENT_PROMISE",
    promisedDate: toCivilDateKey(addCivilDays(todayCivilDate(), 3)),
    note: "Promessa validada localmente."
  });
  assert.ok(promiseId);

  const chargeAfterActions = await prisma.charge.findUniqueOrThrow({
    where: { id: professional.overdueCharge.id },
    include: { collectionActions: true, financialEvents: true }
  });
  assert.equal(chargeAfterActions.status, "PENDING");
  assert.equal(chargeAfterActions.collectionActions.length, 2);
  assert.equal(
    chargeAfterActions.financialEvents.some((event) => event.action === "financial_charge.collection_contact"),
    true
  );
  assert.equal(
    chargeAfterActions.financialEvents.some((event) => event.action === "financial_charge.collection_promise"),
    true
  );

  const overviewWithActions = await getAdminDelinquencyOverview(professional.school.id);
  assert.equal(overviewWithActions.rows[0].latestPromise?.type, "PAYMENT_PROMISE");
  assert.equal(overviewWithActions.rows[0].effectivePromiseStatus, "OPEN");

  await assert.rejects(
    () =>
      registerCollectionAction(professional.school.id, professional.admin.id, {
        chargeId: "charge-from-other-school",
        type: "NOTE",
        note: "Nao deve registrar."
      }),
    (error) => error instanceof FinancialError && error.code === "cobranca"
  );

  await cleanup();
}

main()
  .then(() => {
    console.log("Delinquency validated successfully.");
  })
  .catch(async (error) => {
    await cleanup();
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
