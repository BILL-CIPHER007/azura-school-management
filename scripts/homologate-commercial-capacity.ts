import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EnrollmentStatus, SchoolPlan, StudentCapacity } from "@prisma/client";
import { getStudentUsageMessage, hasCommercialFeature, getStudentUsage } from "../src/lib/commercial-plans";
import { prisma } from "../src/lib/prisma";
import {
  createEnrollmentRegistration,
  createEnrollmentRegistrationInTransaction,
  getActiveStudentCapacity
} from "../src/services/enrollment-registration";
import { getAdminDashboard, getSchoolSettings } from "../src/services/school-data";

const root = process.cwd();
const runId = `commercial-capacity-${Date.now()}`;
const academicYearValue = 2099;
const startsAt = new Date("2099-01-01T12:00:00.000Z");
const endsAt = new Date("2099-12-31T12:00:00.000Z");

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertUsage(current: number, capacity: StudentCapacity, expected: ReturnType<typeof getStudentUsage>["status"]) {
  assert.equal(getStudentUsage(current, capacity).status, expected, `${capacity} com ${current} aluno(s)`);
}

async function cleanup() {
  await prisma.school.deleteMany({ where: { slug: { startsWith: runId } } });
}

async function createSchoolFixture(input: {
  suffix: string;
  plan: SchoolPlan;
  capacity: StudentCapacity;
  activeStudents?: number;
  canceledStudents?: number;
  completedStudents?: number;
  transferredStudents?: number;
}) {
  const school = await prisma.school.create({
    data: {
      name: `Homologacao Capacidade ${input.suffix}`,
      slug: `${runId}-${input.suffix.toLowerCase()}`,
      plan: input.plan,
      studentCapacity: input.capacity
    }
  });

  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Admin ${input.suffix}`,
      email: `${runId}-${input.suffix.toLowerCase()}-admin@azura.local`,
      passwordHash: "hash",
      role: "ADMIN"
    }
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      year: academicYearValue,
      startsAt,
      endsAt,
      isActive: true
    }
  });

  const classroom = await prisma.classroom.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: `Turma ${input.suffix}`,
      gradeLevel: "6 Ano",
      shift: "MATUTINO"
    }
  });

  async function addEnrollment(index: number, status: EnrollmentStatus) {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        fullName: `Aluno ${input.suffix} ${index}`
      }
    });

    return prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        classroomId: classroom.id,
        academicYearId: academicYear.id,
        registration: `${input.suffix}-${index}-${status}-${runId}`.slice(0, 96),
        enrolledAt: startsAt,
        status
      }
    });
  }

  let sequence = 1;
  for (let index = 0; index < (input.activeStudents ?? 0); index += 1) {
    await addEnrollment(sequence, "ACTIVE");
    sequence += 1;
  }
  for (let index = 0; index < (input.canceledStudents ?? 0); index += 1) {
    await addEnrollment(sequence, "CANCELLED");
    sequence += 1;
  }
  for (let index = 0; index < (input.completedStudents ?? 0); index += 1) {
    await addEnrollment(sequence, "COMPLETED");
    sequence += 1;
  }
  for (let index = 0; index < (input.transferredStudents ?? 0); index += 1) {
    await addEnrollment(sequence, "TRANSFERRED");
    sequence += 1;
  }

  return { school, admin, academicYear, classroom };
}

async function main() {
  await cleanup();

  try {
    const migration = read("prisma/migrations/20261006110000_add_student_capacity/migration.sql");
    assert.ok(!/\b(DROP|DELETE|TRUNCATE)\b/i.test(migration), "Migration nao pode conter DROP/DELETE/TRUNCATE.");
    assert.ok(migration.includes('CREATE TYPE "StudentCapacity"'), "Migration deve criar enum StudentCapacity.");
    assert.ok(migration.includes('ADD COLUMN "studentCapacity"'), "Migration deve adicionar School.studentCapacity.");
    assert.ok(migration.includes("WHEN \"plan\" = 'PROFISSIONAL'"), "Migration deve preservar PROFISSIONAL -> UP_TO_500.");
    assert.ok(migration.includes("ELSE 'UP_TO_200'"), "Migration deve preservar ESSENCIAL -> UP_TO_200.");

    const schema = read("prisma/schema.prisma");
    assert.ok(schema.includes("enum StudentCapacity"), "Schema deve conter enum StudentCapacity.");
    assert.ok(schema.includes("studentCapacity           StudentCapacity"), "School deve conter studentCapacity.");

    const capacities: StudentCapacity[] = ["UP_TO_200", "UP_TO_300", "UP_TO_500", "CUSTOM"];
    const plans: SchoolPlan[] = ["ESSENCIAL", "PROFISSIONAL"];
    for (const plan of plans) {
      for (const capacity of capacities) {
        const usage = getStudentUsage(1, capacity);
        assert.ok(usage.label.length > 0, `${plan} + ${capacity} deve ser valido nos helpers.`);
        assert.equal(hasCommercialFeature(plan, "finance"), plan === "PROFISSIONAL");
        assert.equal(hasCommercialFeature(plan, "billing"), plan === "PROFISSIONAL");
      }
    }

    assertUsage(179, "UP_TO_200", "NORMAL");
    assertUsage(180, "UP_TO_200", "WARNING");
    assertUsage(199, "UP_TO_200", "WARNING");
    assertUsage(200, "UP_TO_200", "LIMIT_REACHED");
    assertUsage(201, "UP_TO_200", "OVER_CAPACITY");
    assertUsage(205, "UP_TO_200", "OVER_CAPACITY");

    assertUsage(269, "UP_TO_300", "NORMAL");
    assertUsage(270, "UP_TO_300", "WARNING");
    assertUsage(299, "UP_TO_300", "WARNING");
    assertUsage(300, "UP_TO_300", "LIMIT_REACHED");
    assertUsage(301, "UP_TO_300", "OVER_CAPACITY");

    assertUsage(449, "UP_TO_500", "NORMAL");
    assertUsage(450, "UP_TO_500", "WARNING");
    assertUsage(499, "UP_TO_500", "WARNING");
    assertUsage(500, "UP_TO_500", "LIMIT_REACHED");
    assertUsage(501, "UP_TO_500", "OVER_CAPACITY");

    const customUsage = getStudentUsage(750, "CUSTOM", 25);
    assert.equal(customUsage.status, "NORMAL");
    assert.equal(customUsage.maxActiveStudents, null);
    assert.equal(customUsage.usagePercent, null);
    assert.equal(customUsage.exceededBy, 0);
    assert.ok(!getStudentUsageMessage(customUsage).includes("0 de 0"));

    const normalSchool = await createSchoolFixture({
      suffix: "normal",
      plan: "ESSENCIAL",
      capacity: "UP_TO_200",
      activeStudents: 179
    });
    const warningSchool = await createSchoolFixture({
      suffix: "warning",
      plan: "ESSENCIAL",
      capacity: "UP_TO_200",
      activeStudents: 180
    });
    const limitSchool = await createSchoolFixture({
      suffix: "limit",
      plan: "ESSENCIAL",
      capacity: "UP_TO_200",
      activeStudents: 200
    });
    const overSchool = await createSchoolFixture({
      suffix: "over",
      plan: "ESSENCIAL",
      capacity: "UP_TO_200",
      activeStudents: 201,
      canceledStudents: 2,
      completedStudents: 1,
      transferredStudents: 1
    });
    const proSmallSchool = await createSchoolFixture({
      suffix: "prosmall",
      plan: "PROFISSIONAL",
      capacity: "UP_TO_200",
      activeStudents: 3
    });
    const essentialLargeSchool = await createSchoolFixture({
      suffix: "essentiallarge",
      plan: "ESSENCIAL",
      capacity: "UP_TO_500",
      activeStudents: 3
    });

    assert.equal((await prisma.school.findUniqueOrThrow({ where: { id: normalSchool.school.id } })).studentCapacity, "UP_TO_200");
    assert.equal((await getActiveStudentCapacity(prisma, normalSchool.school.id, 0)).status, "NORMAL");
    assert.equal((await getActiveStudentCapacity(prisma, warningSchool.school.id, 0)).status, "WARNING");
    assert.equal((await getActiveStudentCapacity(prisma, limitSchool.school.id, 0)).status, "LIMIT_REACHED");
    assert.equal((await getActiveStudentCapacity(prisma, overSchool.school.id, 0)).status, "OVER_CAPACITY");
    assert.equal((await getActiveStudentCapacity(prisma, overSchool.school.id, 0)).currentActiveStudents, 201);

    const overBefore = await getActiveStudentCapacity(prisma, overSchool.school.id);
    const manualEnrollment = await createEnrollmentRegistration({
      schoolId: overSchool.school.id,
      userId: overSchool.admin.id,
      studentName: "Aluno Manual Acima Da Capacidade",
      guardianName: "Responsavel Manual",
      relation: "Responsavel",
      academicYearId: overSchool.academicYear.id,
      classroomId: overSchool.classroom.id,
      enrolledAt: "2099-02-01"
    });
    assert.ok(manualEnrollment.enrollmentId, "Matricula manual acima da capacidade deve ser permitida.");
    const overAfterManual = await getActiveStudentCapacity(prisma, overSchool.school.id);
    assert.equal(overAfterManual.currentActiveStudents, overBefore.currentActiveStudents + 1);
    assert.equal(overAfterManual.status, "OVER_CAPACITY");

    const csvBefore = await getActiveStudentCapacity(prisma, overSchool.school.id);
    await prisma.$transaction(async (tx) => {
      for (const index of [1, 2]) {
        await createEnrollmentRegistrationInTransaction(tx, {
          schoolId: overSchool.school.id,
          userId: overSchool.admin.id,
          studentName: `Aluno CSV Acima ${index}`,
          guardianName: `Responsavel CSV ${index}`,
          relation: "Responsavel",
          academicYearId: overSchool.academicYear.id,
          classroomId: overSchool.classroom.id,
          enrolledAt: "2099-02-02",
          auditAction: "student_import.enrollment_created"
        });
      }
    });
    const csvAfter = await getActiveStudentCapacity(prisma, overSchool.school.id);
    assert.equal(csvAfter.currentActiveStudents, csvBefore.currentActiveStudents + 2);
    assert.equal(csvAfter.status, "OVER_CAPACITY");

    const dashboardNormal = await getAdminDashboard(normalSchool.school.id);
    const dashboardWarning = await getAdminDashboard(warningSchool.school.id);
    const dashboardLimit = await getAdminDashboard(limitSchool.school.id);
    const dashboardOver = await getAdminDashboard(overSchool.school.id);
    assert.equal(dashboardNormal.commercialUsage.status, "NORMAL");
    assert.equal(dashboardWarning.commercialUsage.status, "WARNING");
    assert.equal(dashboardLimit.commercialUsage.status, "LIMIT_REACHED");
    assert.equal(dashboardOver.commercialUsage.status, "OVER_CAPACITY");
    assert.ok(getStudentUsageMessage(dashboardWarning.commercialUsage).includes("próxima da capacidade contratada"));
    assert.ok(getStudentUsageMessage(dashboardOver.commercialUsage).includes("operação acadêmica continua disponível"));

    const settings = await getSchoolSettings(overSchool.school.id);
    assert.equal(settings.school.studentCapacity, "UP_TO_200");
    assert.equal(settings.activeStudentsCount, csvAfter.currentActiveStudents);

    assert.equal(hasCommercialFeature("ESSENCIAL", "financialModule"), false);
    assert.equal(hasCommercialFeature("PROFISSIONAL", "financialModule"), true);
    assert.equal(hasCommercialFeature(essentialLargeSchool.school.plan, "finance"), false, "Essencial + 500 deve continuar sem financeiro.");
    assert.equal(hasCommercialFeature(proSmallSchool.school.plan, "finance"), true, "Profissional + 200 deve continuar com financeiro.");

    const schoolAUsage = await getActiveStudentCapacity(prisma, essentialLargeSchool.school.id);
    const schoolBUsage = await getActiveStudentCapacity(prisma, proSmallSchool.school.id);
    assert.equal(schoolAUsage.studentCapacity, "UP_TO_500");
    assert.equal(schoolBUsage.studentCapacity, "UP_TO_200");
    assert.equal(schoolAUsage.currentActiveStudents, 3);
    assert.equal(schoolBUsage.currentActiveStudents, 3);
    assert.equal((await getAdminDashboard(essentialLargeSchool.school.id)).commercialUsage.studentCapacity, "UP_TO_500");
    assert.equal((await getAdminDashboard(proSmallSchool.school.id)).commercialUsage.studentCapacity, "UP_TO_200");

    const actionSource = read("src/app/actions/academic.ts");
    const enrollmentSource = read("src/services/enrollment-registration.ts");
    const settingsPage = read("src/app/admin/configuracoes/page.tsx");
    assert.ok(!actionSource.includes("!capacity.allowed"), "Importacao CSV nao deve bloquear por capacidade.");
    assert.ok(!enrollmentSource.includes("limite-alunos-ativos"), "Matricula nao deve conter erro comercial legado.");
    assert.ok(!settingsPage.includes("limite do plano"), "Configuracoes nao deve falar em limite do plano.");
    assert.ok(settingsPage.includes("Plano funcional"));
    assert.ok(settingsPage.includes("Capacidade contratada"));

    console.log("Commercial capacity homologation completed successfully.");
  } finally {
    await cleanup();
    const remaining = await prisma.school.count({ where: { slug: { startsWith: runId } } });
    assert.equal(remaining, 0, "Cleanup deve remover escolas temporarias.");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
