import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import {
  assertCollectionMessagePrivacy,
  generateCollectionCommunicationMessage
} from "../src/lib/collection-communication";
import {
  dateFromCivilInput,
  getDaysOverdue,
  toCivilDateKey,
  todayCivilDate
} from "../src/lib/financial-core";
import { prisma } from "../src/lib/prisma";
import {
  buildCollectionEmailSubject,
  EmailCommunicationError,
  sendCollectionEmail
} from "../src/services/email-communication";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260930145140_add_collection_email_delivery", "migration.sql"),
  "utf8"
);
const emailService = readFileSync(join(root, "src", "services", "email-communication.ts"), "utf8");
const communicationPanel = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "collection-communication-panel.tsx"),
  "utf8"
);
const adminDelinquencyPage = readFileSync(
  join(root, "src", "app", "admin", "financeiro", "inadimplencia", "page.tsx"),
  "utf8"
);
const guardianFinancialPage = readFileSync(join(root, "src", "app", "responsavel", "financeiro", "page.tsx"), "utf8");

assert.match(schema, /deliveryStatus\s+String\?/);
assert.match(schema, /providerMessageId\s+String\?/);
assert.match(schema, /recipient\s+String\?/);
assert.match(schema, /subject\s+String\?/);
assert.match(migration, /ADD COLUMN\s+"deliveryStatus" TEXT/);
assert.doesNotMatch(migration, /ALTER TABLE "Charge"/);
assert.match(emailService, /https:\/\/api\.resend\.com\/emails/);
assert.match(emailService, /EMAIL_PROVIDER/);
assert.match(emailService, /RESEND_API_KEY/);
assert.match(emailService, /EMAIL_FROM/);
assert.match(emailService, /VERCEL_ENV/);
assert.match(emailService, /@resend\.dev/);
assert.match(emailService, /Envio por e-mail ainda nao esta configurado para producao/);
assert.doesNotMatch(emailService, /setInterval|cron|bulk|campaign/i);
assert.match(communicationPanel, /Enviar e-mail/);
assert.match(communicationPanel, /window\.confirm/);
assert.match(communicationPanel, /Copiar mensagem/);
assert.match(communicationPanel, /Registrar comunicacao/);
assert.match(adminDelinquencyPage, /Tentar novamente/);
assert.doesNotMatch(guardianFinancialPage, /CollectionAction|deliveryStatus|providerMessageId|messageBody|Tentar novamente/);

const slugPrefix = "validacao-email-cobranca-";

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

async function createSchoolFixture(plan: "ESSENCIAL" | "PROFISSIONAL", suffix: string, guardianEmail?: string | null) {
  const today = todayCivilDate();
  const school = await prisma.school.create({
    data: {
      name: `Validacao Email ${suffix}`,
      slug: `${slugPrefix}${suffix}`,
      plan
    }
  });
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Admin ${suffix}`,
      email: `admin-email-${suffix}@validacao.local`,
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
      cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
      relation: "Responsavel",
      phone: "(11) 98888-0000",
      email: guardianEmail
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
      registration: `EMAIL-${suffix}`,
      enrolledAt: dateFromCivilInput("2026-01-20")!
    }
  });
  const charge = await prisma.charge.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Mensalidade email",
      description: "Validacao local de e-mail assistido",
      amount: new Prisma.Decimal("88.40"),
      dueDate: addCivilDays(today, -9),
      status: "PENDING",
      competence: "2026-09",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_safe_test"
    }
  });

  return { school, admin, guardian, student, charge };
}

function emailInput(fixture: Awaited<ReturnType<typeof createSchoolFixture>>, subject = "Regularizacao de mensalidade - Validacao") {
  const daysOverdue = getDaysOverdue(fixture.charge.dueDate);
  const message = generateCollectionCommunicationMessage(
    {
      guardianName: fixture.guardian.fullName,
      studentName: fixture.student.fullName,
      schoolName: fixture.school.name,
      competence: fixture.charge.competence,
      amount: fixture.charge.amount,
      dueDate: fixture.charge.dueDate,
      daysOverdue
    },
    "ATRASO_MODERADO"
  );

  return {
    chargeId: fixture.charge.id,
    communicationType: message.type,
    messageTemplate: message.templateId,
    messageBody: message.body,
    subject,
    acknowledgedRecentContact: true
  };
}

async function main() {
  const previousProvider = process.env.EMAIL_PROVIDER;
  process.env.EMAIL_PROVIDER = "mock";

  await cleanup();
  try {
    const professional = await createSchoolFixture("PROFISSIONAL", "profissional", "familia-email@validacao.local");
    const essential = await createSchoolFixture("ESSENCIAL", "essencial", "familia-essential@validacao.local");
    const withoutEmail = await createSchoolFixture("PROFISSIONAL", "sem-email", null);
    const failing = await createSchoolFixture("PROFISSIONAL", "falha", "falha-provider@validacao.local");

    const subject = buildCollectionEmailSubject({ communicationType: "ATRASO_MODERADO", schoolName: professional.school.name });
    assert.equal(subject.includes("INADIMPLENTE"), false);
    assert.equal(subject.includes("DIVIDA"), false);
    assert.equal(subject.includes(professional.school.name), true);

    const originalCharge = await prisma.charge.findUniqueOrThrow({ where: { id: professional.charge.id } });
    const sent = await sendCollectionEmail(professional.school.id, professional.admin.id, emailInput(professional, subject));
    assert.equal(sent.status, "SENT");

    const sentAction = await prisma.collectionAction.findUniqueOrThrow({ where: { id: sent.actionId } });
    assert.equal(sentAction.schoolId, professional.school.id);
    assert.equal(sentAction.chargeId, professional.charge.id);
    assert.equal(sentAction.channel, "EMAIL");
    assert.equal(sentAction.deliveryStatus, "SENT");
    assert.equal(sentAction.provider, "mock");
    assert.ok(sentAction.providerMessageId);
    assert.ok(sentAction.sentAt);
    assert.equal(sentAction.recipient, "familia-email@validacao.local");
    assert.equal(sentAction.subject, subject);
    assert.ok(sentAction.messageBody);
    assert.equal(assertCollectionMessagePrivacy(sentAction.messageBody!), true);
    assert.equal(sentAction.messageBody!.includes(professional.guardian.cpf!), false);

    const chargeAfterSent = await prisma.charge.findUniqueOrThrow({ where: { id: professional.charge.id } });
    assert.equal(chargeAfterSent.status, originalCharge.status);
    assert.equal(chargeAfterSent.amount.toString(), originalCharge.amount.toString());
    assert.equal(chargeAfterSent.dueDate.getTime(), originalCharge.dueDate.getTime());
    assert.equal(chargeAfterSent.paidAt, null);
    assert.equal(chargeAfterSent.canceledAt, null);
    assert.equal(chargeAfterSent.refundedAt, null);

    await assert.rejects(
      () => sendCollectionEmail(professional.school.id, professional.admin.id, { ...emailInput(professional), acknowledgedRecentContact: false }),
      (error) => error instanceof EmailCommunicationError && error.code === "recente"
    );

    await assert.rejects(
      () => sendCollectionEmail(essential.school.id, essential.admin.id, emailInput(essential)),
      (error) => error instanceof EmailCommunicationError && error.code === "plano"
    );

    await assert.rejects(
      () => sendCollectionEmail(withoutEmail.school.id, withoutEmail.admin.id, emailInput(withoutEmail)),
      (error) => error instanceof EmailCommunicationError && error.code === "destinatario"
    );

    await assert.rejects(
      () => sendCollectionEmail(essential.school.id, essential.admin.id, emailInput(professional)),
      (error) => error instanceof EmailCommunicationError && (error.code === "plano" || error.code === "cobranca")
    );

    await assert.rejects(
      () =>
        sendCollectionEmail(failing.school.id, failing.admin.id, {
          ...emailInput(failing, "Falha simulada"),
          acknowledgedRecentContact: true
        }),
      (error) => error instanceof EmailCommunicationError && error.code === "provider"
    );
    const failedActions = await prisma.collectionAction.findMany({
      where: { chargeId: failing.charge.id, channel: "EMAIL" },
      orderBy: { createdAt: "asc" }
    });
    assert.equal(failedActions.length, 1);
    assert.equal(failedActions[0].deliveryStatus, "FAILED");
    assert.ok(failedActions[0].deliveryError);

    await prisma.guardian.update({
      where: { id: failing.guardian.id },
      data: { email: "familia-retry@validacao.local" }
    });
    const retry = await sendCollectionEmail(failing.school.id, failing.admin.id, {
      ...emailInput(failing, "Regularizacao de mensalidade - Retry"),
      acknowledgedRecentContact: true
    });
    const retryAction = await prisma.collectionAction.findUniqueOrThrow({ where: { id: retry.actionId } });
    assert.equal(retryAction.deliveryStatus, "SENT");

    const chargeAfterFailureAndRetry = await prisma.charge.findUniqueOrThrow({ where: { id: failing.charge.id } });
    assert.equal(chargeAfterFailureAndRetry.status, "PENDING");

    console.log("Email communications validated successfully.");
  } finally {
    if (previousProvider === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = previousProvider;
    }
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  await cleanup();
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
