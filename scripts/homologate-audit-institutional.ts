import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient, type AuditSource, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const root = process.cwd();
const runId = `audit-homolog-${Date.now()}`;
const tempExternalEventId = `${runId}-asaas-webhook`;
const failures: string[] = [];

type JsonObject = Record<string, unknown>;

const FORBIDDEN_KEY_PATTERN = /password|passwordHash|token|apiKey|authorization|cookie|secret|accessToken|refreshToken/i;
const SENSITIVE_KEY_PATTERN = /cpf|cnpj|email|phone|telefone|address|endereco/i;

function assertCheck(condition: unknown, message: string) {
  if (!condition) failures.push(message);
}

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function maskCpf(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return digits ? "***" : null;
  return `***.***.***-${digits.slice(-2)}`;
}

function maskEmail(value: unknown) {
  const email = String(value ?? "").trim();
  if (!email || !email.includes("@")) return email ? "***" : null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return digits ? "***" : null;
  return `***${digits.slice(-4)}`;
}

function sanitizeSensitiveValue(key: string, value: unknown) {
  const normalized = key.toLowerCase();
  if (normalized.includes("cpf") || normalized.includes("cnpj")) return maskCpf(value);
  if (normalized.includes("email")) return maskEmail(value);
  if (normalized.includes("phone") || normalized.includes("telefone")) return maskPhone(value);
  if (normalized.includes("address") || normalized.includes("endereco")) return value ? "[alterado]" : null;
  return value;
}

function sanitizeAuditValue(value: unknown, key = ""): Prisma.InputJsonValue | null | undefined {
  if (FORBIDDEN_KEY_PATTERN.test(key)) return undefined;
  if (value === undefined) return undefined;
  if (value === null) return null;

  const safeValue = SENSITIVE_KEY_PATTERN.test(key) ? sanitizeSensitiveValue(key, value) : value;
  if (safeValue instanceof Date) return safeValue.toISOString();
  if (typeof safeValue === "string" || typeof safeValue === "number" || typeof safeValue === "boolean") return safeValue;

  if (Array.isArray(safeValue)) {
    return safeValue
      .map((item) => sanitizeAuditValue(item, key))
      .filter((item): item is Prisma.InputJsonValue | null => item !== undefined);
  }

  if (isPlainObject(safeValue)) {
    const result: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [itemKey, itemValue] of Object.entries(safeValue)) {
      if (FORBIDDEN_KEY_PATTERN.test(itemKey)) continue;
      const sanitized = sanitizeAuditValue(itemValue, itemKey);
      if (sanitized !== undefined) result[itemKey] = sanitized;
    }
    return result;
  }

  return String(safeValue);
}

function prismaJson(value: Prisma.InputJsonValue | null | undefined) {
  if (value === null) return Prisma.JsonNull;
  return value;
}

function sourceFromRole(role?: UserRole | null): AuditSource {
  if (role === "ADMIN") return "ADMIN";
  if (role === "PROFESSOR") return "PROFESSOR";
  if (role === "ALUNO") return "ALUNO";
  if (role === "RESPONSAVEL") return "RESPONSAVEL";
  return "SYSTEM";
}

async function audit(input: {
  schoolId: string;
  userId?: string | null;
  actorRole?: UserRole | null;
  action: string;
  entity: string;
  entityId: string;
  source?: AuditSource;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId ?? null,
      actorRole: input.actorRole ?? null,
      source: input.source ?? sourceFromRole(input.actorRole),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: prismaJson(sanitizeAuditValue(input.before)),
      after: prismaJson(sanitizeAuditValue(input.after)),
      metadata: prismaJson(sanitizeAuditValue(input.metadata))
    }
  });
}

function asObject(value: Prisma.JsonValue | null): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function hasForbiddenJson(value: unknown): boolean {
  const text = JSON.stringify(value ?? {});
  return /senha|password|passwordHash|token|apiKey|authorization|cookie|secret|accessToken|refreshToken|12345678901|homolog-secret/i.test(text);
}

async function cleanup() {
  await prisma.asaasWebhookEvent.deleteMany({ where: { externalEventId: tempExternalEventId } });
  const schools = await prisma.school.findMany({ where: { slug: { startsWith: runId } }, select: { id: true } });
  for (const school of schools) {
    await prisma.school.delete({ where: { id: school.id } });
  }
}

async function main() {
  await cleanup();

  const migrationSql = read("prisma/migrations/20261005133000_add_institutional_audit/migration.sql");
  assertCheck(!/\b(DROP|DELETE|TRUNCATE)\b/i.test(migrationSql), "Migration de auditoria nao deve conter DROP/DELETE/TRUNCATE.");
  for (const field of ['"actorRole"', '"source"', '"before"', '"after"', '"metadata"']) {
    assertCheck(migrationSql.includes(field), `Migration deve conter ${field}.`);
  }

  const helper = read("src/lib/audit.ts");
  assertCheck(helper.includes("server-only") && helper.includes("typeof window"), "Helper deve ter protecao server-only.");
  for (const key of ["passwordHash", "apiKey", "authorization", "accessToken", "refreshToken", "maskCpf", "maskEmail", "maskPhone"]) {
    assertCheck(helper.includes(key), `Helper deve cobrir sanitizacao de ${key}.`);
  }

  const schoolA = await prisma.school.create({ data: { name: "Homologacao Auditoria A", slug: `${runId}-a`, plan: "PROFISSIONAL" } });
  const schoolB = await prisma.school.create({ data: { name: "Homologacao Auditoria B", slug: `${runId}-b`, plan: "PROFISSIONAL" } });

  const adminA = await prisma.user.create({
    data: { schoolId: schoolA.id, name: "Admin Auditoria A", email: `${runId}-admin-a@azura.local`, passwordHash: "hash", role: "ADMIN" }
  });
  const adminB = await prisma.user.create({
    data: { schoolId: schoolB.id, name: "Admin Auditoria B", email: `${runId}-admin-b@azura.local`, passwordHash: "hash", role: "ADMIN" }
  });
  const teacherUser = await prisma.user.create({
    data: { schoolId: schoolA.id, name: "Professor Auditoria", email: `${runId}-prof@azura.local`, passwordHash: "hash", role: "PROFESSOR" }
  });

  const year = await prisma.academicYear.create({
    data: {
      schoolId: schoolA.id,
      year: 2099,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      endsAt: new Date("2099-12-31T00:00:00.000Z"),
      isActive: false
    }
  });
  const period = await prisma.academicPeriod.create({
    data: {
      schoolId: schoolA.id,
      academicYearId: year.id,
      name: "Homologacao",
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      endsAt: new Date("2099-03-31T00:00:00.000Z"),
      sortOrder: 1
    }
  });
  const subject = await prisma.subject.create({ data: { schoolId: schoolA.id, name: "Auditoria", code: `${runId}-AUD` } });
  const classroom = await prisma.classroom.create({
    data: { schoolId: schoolA.id, academicYearId: year.id, name: "Turma Auditoria", gradeLevel: "9 Ano", shift: "MATUTINO" }
  });
  const student = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      fullName: "Aluno Auditoria",
      cpf: "12345678901",
      email: `${runId}-aluno@azura.local`,
      phone: "(11) 99999-1111",
      address: "Rua Secreta, 123"
    }
  });
  const guardian = await prisma.guardian.create({
    data: {
      schoolId: schoolA.id,
      fullName: "Responsavel Auditoria",
      relation: "Responsavel",
      cpf: "12345678901",
      email: `${runId}-resp@azura.local`,
      phone: "(11) 98888-2222"
    }
  });
  await prisma.guardianStudent.create({ data: { guardianId: guardian.id, studentId: student.id, isPrimary: true } });
  const teacher = await prisma.teacher.create({
    data: { schoolId: schoolA.id, userId: teacherUser.id, fullName: "Professor Auditoria", email: `${runId}-prof@azura.local"`, status: "ACTIVE" }
  });
  const enrollment = await prisma.enrollment.create({
    data: {
      schoolId: schoolA.id,
      studentId: student.id,
      classroomId: classroom.id,
      academicYearId: year.id,
      registration: `${runId}-REG`,
      enrolledAt: new Date("2099-01-10T00:00:00.000Z"),
      status: "ACTIVE"
    }
  });
  const assignment = await prisma.teacherSubject.create({
    data: { schoolId: schoolA.id, teacherId: teacher.id, subjectId: subject.id, classroomId: classroom.id }
  });

  const grade = await prisma.grade.create({
    data: {
      schoolId: schoolA.id,
      enrollmentId: enrollment.id,
      subjectId: subject.id,
      academicPeriodId: period.id,
      teacherId: teacher.id,
      av1: 6,
      av2: 6,
      assignment: 6,
      average: 6
    }
  });
  await prisma.grade.update({ where: { id: grade.id }, data: { av1: 8, av2: 8, assignment: 8, average: 8 } });
  const gradeLog = await audit({
    schoolId: schoolA.id,
    userId: teacherUser.id,
    actorRole: "PROFESSOR",
    action: "grade.updated",
    entity: "Grade",
    entityId: grade.id,
    before: { average: 6 },
    after: { average: 8 },
    metadata: { studentId: student.id, studentName: student.fullName, subjectId: subject.id, periodId: period.id }
  });

  const attendance = await prisma.attendance.create({
    data: {
      schoolId: schoolA.id,
      enrollmentId: enrollment.id,
      classroomId: classroom.id,
      subjectId: subject.id,
      date: new Date("2099-02-01T00:00:00.000Z"),
      status: "PRESENT"
    }
  });
  await prisma.attendance.update({ where: { id: attendance.id }, data: { status: "ABSENT" } });
  const attendanceLog = await audit({
    schoolId: schoolA.id,
    userId: teacherUser.id,
    actorRole: "PROFESSOR",
    action: "attendance.updated",
    entity: "Attendance",
    entityId: attendance.id,
    before: { status: "PRESENT" },
    after: { status: "ABSENT" },
    metadata: { classroomId: classroom.id, subjectId: subject.id, date: attendance.date, studentId: student.id }
  });

  const diary = await prisma.classDiaryEntry.create({
    data: {
      schoolId: schoolA.id,
      classroomId: classroom.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      date: new Date("2099-02-02T00:00:00.000Z"),
      content: "Conteudo anterior",
      notes: "Observacao anterior"
    }
  });
  await prisma.classDiaryEntry.update({ where: { id: diary.id }, data: { content: "Conteudo novo", notes: "Observacao nova" } });
  await audit({
    schoolId: schoolA.id,
    userId: teacherUser.id,
    actorRole: "PROFESSOR",
    action: "class_diary.updated",
    entity: "ClassDiaryEntry",
    entityId: diary.id,
    before: { content: "Conteudo anterior", notes: "Observacao anterior" },
    after: { content: "Conteudo novo", notes: "Observacao nova" },
    metadata: { classroomId: classroom.id, subjectId: subject.id, teacherId: teacher.id, date: diary.date }
  });

  const guardianLog = await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "guardian.updated",
    entity: "Guardian",
    entityId: guardian.id,
    before: { fullName: "Responsavel Auditoria", cpf: "12345678901", email: `${runId}-resp@azura.local`, phone: "(11) 98888-2222" },
    after: { fullName: "Responsavel Auditoria Editado", cpf: "12345678909", email: `${runId}-resp-editado@azura.local`, phone: "(11) 97777-3333" }
  });

  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "enrollment.created",
    entity: "Enrollment",
    entityId: enrollment.id,
    after: { registration: enrollment.registration, classroomId: classroom.id, academicYearId: year.id, status: enrollment.status }
  });

  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "student_import.completed",
    entity: "Enrollment",
    entityId: enrollment.id,
    metadata: { totalRows: 1, createdRows: 1, csv: undefined }
  });

  await prisma.academicPeriod.update({ where: { id: period.id }, data: { closedAt: new Date("2099-04-01T00:00:00.000Z") } });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "academic_period.closed",
    entity: "AcademicPeriod",
    entityId: period.id,
    before: { closedAt: null },
    after: { closedAt: "2099-04-01T00:00:00.000Z" },
    metadata: { academicYearId: year.id }
  });
  await prisma.academicPeriod.update({ where: { id: period.id }, data: { closedAt: null } });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "academic_period.reopened",
    entity: "AcademicPeriod",
    entityId: period.id,
    before: { closedAt: "2099-04-01T00:00:00.000Z" },
    after: { closedAt: null },
    metadata: { academicYearId: year.id }
  });

  for (const documentType of ["boletim", "historico", "declaracao-matricula"]) {
    await audit({
      schoolId: schoolA.id,
      userId: adminA.id,
      actorRole: "ADMIN",
      action: "document.generated",
      entity: documentType === "historico" ? "Student" : "Enrollment",
      entityId: documentType === "historico" ? student.id : enrollment.id,
      source: "ADMIN",
      metadata: { documentType, studentId: student.id, academicYearId: year.id }
    });
  }

  await audit({ schoolId: schoolA.id, userId: adminA.id, actorRole: "ADMIN", action: "auth.login_success", entity: "User", entityId: adminA.id });
  await audit({ schoolId: schoolA.id, userId: adminA.id, actorRole: "ADMIN", action: "auth.logout", entity: "User", entityId: adminA.id });
  await audit({
    schoolId: schoolA.id,
    userId: null,
    actorRole: null,
    action: "auth.login_failed",
    entity: "User",
    entityId: adminA.id,
    source: "SYSTEM",
    metadata: { email: adminA.email, password: "super-secret", cookie: "homolog-secret" }
  });

  const announcement = await prisma.announcement.create({
    data: { schoolId: schoolA.id, authorId: adminA.id, classroomId: classroom.id, title: "Comunicado homologacao", content: "Conteudo controlado", audience: "STUDENTS" }
  });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "announcement.created",
    entity: "Announcement",
    entityId: announcement.id,
    after: { title: announcement.title, audience: announcement.audience, classroomId: announcement.classroomId }
  });

  const event = await prisma.calendarEvent.create({
    data: {
      schoolId: schoolA.id,
      academicYearId: year.id,
      title: "Evento homologacao",
      type: "EVENTO",
      startsAt: new Date("2099-05-10T12:00:00.000Z"),
      startTime: "09:00",
      endTime: "10:00"
    }
  });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "calendar_event.created",
    entity: "CalendarEvent",
    entityId: event.id,
    after: { title: event.title, type: event.type, startsAt: event.startsAt, startTime: event.startTime, endTime: event.endTime }
  });

  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "teacher_assignment.created",
    entity: "TeacherSubject",
    entityId: assignment.id,
    after: { teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id }
  });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "teacher_assignment.deleted",
    entity: "TeacherSubject",
    entityId: assignment.id,
    before: { teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id },
    metadata: { gradeCount: 1, attendanceCount: 1 }
  });

  const charge = await prisma.charge.create({
    data: {
      schoolId: schoolA.id,
      studentId: student.id,
      guardianId: guardian.id,
      enrollmentId: enrollment.id,
      reference: "Homologacao auditoria",
      amount: new Prisma.Decimal(12.34),
      dueDate: new Date("2099-06-10T00:00:00.000Z"),
      status: "PENDING",
      competence: "2099-06"
    }
  });
  await prisma.charge.update({ where: { id: charge.id }, data: { status: "PAID", paidAt: new Date("2099-06-09T00:00:00.000Z") } });
  await prisma.chargeFinancialEvent.create({
    data: {
      schoolId: schoolA.id,
      chargeId: charge.id,
      userId: adminA.id,
      source: "ADMIN",
      action: "Pagamento manual homologado",
      previousStatus: "PENDING",
      nextStatus: "PAID"
    }
  });
  await audit({
    schoolId: schoolA.id,
    userId: adminA.id,
    actorRole: "ADMIN",
    action: "charge.marked_paid",
    entity: "Charge",
    entityId: charge.id,
    before: { status: "PENDING" },
    after: { status: "PAID" },
    metadata: { amount: "12.34" }
  });

  await prisma.asaasWebhookEvent.create({
    data: { externalEventId: tempExternalEventId, eventType: "PAYMENT_RECEIVED", externalPaymentId: `${runId}-payment` }
  });

  await audit({
    schoolId: schoolB.id,
    userId: adminB.id,
    actorRole: "ADMIN",
    action: "legacy.event",
    entity: "Legacy",
    entityId: `${runId}-legacy-b`,
    source: "ADMIN"
  });
  await prisma.auditLog.create({
    data: {
      schoolId: schoolA.id,
      userId: adminA.id,
      action: "legacy.before_migration",
      entity: "Legacy",
      entityId: `${runId}-legacy-a`
    }
  });

  for (let index = 0; index < 27; index += 1) {
    await audit({
      schoolId: schoolA.id,
      userId: adminA.id,
      actorRole: "ADMIN",
      action: "homologation.pagination",
      entity: "AuditLog",
      entityId: `${runId}-page-${index}`,
      metadata: { index }
    });
  }

  const reloadedGradeLog = await prisma.auditLog.findUniqueOrThrow({ where: { id: gradeLog.id } });
  const gradeBefore = asObject(reloadedGradeLog.before);
  const gradeAfter = asObject(reloadedGradeLog.after);
  assertCheck(reloadedGradeLog.schoolId === schoolA.id, "Nota deve registrar schoolId correto.");
  assertCheck(reloadedGradeLog.userId === teacherUser.id, "Nota deve registrar professor/usuario correto.");
  assertCheck(reloadedGradeLog.actorRole === "PROFESSOR", "Nota deve registrar actorRole PROFESSOR.");
  assertCheck(reloadedGradeLog.source === "PROFESSOR", "Nota deve registrar source PROFESSOR.");
  assertCheck(gradeBefore.average === 6 && gradeAfter.average === 8, "Nota deve registrar before 6 e after 8.");

  const reloadedAttendanceLog = await prisma.auditLog.findUniqueOrThrow({ where: { id: attendanceLog.id } });
  assertCheck(asObject(reloadedAttendanceLog.before).status === "PRESENT", "Frequencia deve registrar PRESENT antes.");
  assertCheck(asObject(reloadedAttendanceLog.after).status === "ABSENT", "Frequencia deve registrar ABSENT depois.");

  const reloadedGuardianLog = await prisma.auditLog.findUniqueOrThrow({ where: { id: guardianLog.id } });
  assertCheck(!hasForbiddenJson(reloadedGuardianLog.before) && !hasForbiddenJson(reloadedGuardianLog.after), "Responsavel nao deve expor CPF completo ou secrets.");
  assertCheck(JSON.stringify(reloadedGuardianLog.after).includes("***.***.***-09"), "CPF deve aparecer mascarado.");
  assertCheck(JSON.stringify(reloadedGuardianLog.after).includes("***3333"), "Telefone deve aparecer mascarado.");
  assertCheck(JSON.stringify(reloadedGuardianLog.after).includes("***@"), "E-mail deve aparecer mascarado.");

  const failedLogin = await prisma.auditLog.findFirstOrThrow({ where: { schoolId: schoolA.id, action: "auth.login_failed" } });
  assertCheck(!hasForbiddenJson(failedLogin.metadata), "Falha de login nao deve gravar senha/cookie/token.");

  const documentCount = await prisma.auditLog.count({ where: { schoolId: schoolA.id, action: "document.generated" } });
  assertCheck(documentCount === 3, "Documentos devem registrar boletim, historico e declaracao.");

  const financialAuditCount = await prisma.auditLog.count({ where: { schoolId: schoolA.id, action: "charge.marked_paid", entityId: charge.id } });
  const financialEventCount = await prisma.chargeFinancialEvent.count({ where: { schoolId: schoolA.id, chargeId: charge.id } });
  assertCheck(financialAuditCount === 1 && financialEventCount === 1, "Financeiro deve complementar AuditLog e historico de dominio.");

  const schoolALogs = await prisma.auditLog.findMany({
    where: { schoolId: schoolA.id },
    orderBy: { createdAt: "desc" },
    take: 25
  });
  const schoolBLogs = await prisma.auditLog.findMany({ where: { schoolId: schoolB.id } });
  assertCheck(schoolALogs.every((log) => log.schoolId === schoolA.id), "Consulta da escola A nao pode retornar escola B.");
  assertCheck(schoolBLogs.every((log) => log.schoolId === schoolB.id), "Consulta da escola B nao pode retornar escola A.");
  assertCheck(!schoolALogs.some((log) => log.entityId === `${runId}-legacy-b`), "EntityId de outra escola nao deve aparecer na escola A.");

  const page1 = await prisma.auditLog.findMany({
    where: { schoolId: schoolA.id, action: "homologation.pagination" },
    orderBy: { createdAt: "desc" },
    skip: 0,
    take: 25
  });
  const page2 = await prisma.auditLog.findMany({
    where: { schoolId: schoolA.id, action: "homologation.pagination" },
    orderBy: { createdAt: "desc" },
    skip: 25,
    take: 25
  });
  assertCheck(page1.length === 25 && page2.length === 2, "Paginacao deve limitar 25 registros e preservar pagina seguinte.");
  assertCheck(!page1.some((item) => page2.some((other) => other.id === item.id)), "Paginacao nao deve duplicar registros entre paginas.");

  const oldLog = await prisma.auditLog.findFirstOrThrow({ where: { schoolId: schoolA.id, action: "legacy.before_migration" } });
  assertCheck(oldLog.before === null && oldLog.after === null && oldLog.metadata === null, "Logs antigos com campos nulos devem ser compativeis.");

  const auditPage = read("src/app/admin/configuracoes/auditoria/page.tsx");
  assertCheck(auditPage.includes('requireSession(["ADMIN"])'), "Tela de auditoria deve exigir ADMIN no backend.");
  assertCheck(!/deleteAudit|auditLog\.delete|Excluir log/i.test(auditPage), "Tela de auditoria nao deve expor exclusao de log.");
  for (const expected of ["auditActionLabel", "auditEntityLabel", "auditSourceLabel", "AuditValueList", "buildHref"]) {
    assertCheck(auditPage.includes(expected), `Tela de auditoria deve conter ${expected}.`);
  }

  const allTempLogs = await prisma.auditLog.findMany({ where: { schoolId: schoolA.id }, select: { before: true, after: true, metadata: true } });
  assertCheck(allTempLogs.every((log) => !hasForbiddenJson(log.before) && !hasForbiddenJson(log.after) && !hasForbiddenJson(log.metadata)), "Nenhum log temporario deve conter secrets ou PII integral testada.");

  if (failures.length) {
    throw new Error(failures.map((failure) => `- ${failure}`).join("\n"));
  }

  await cleanup();
  const remainingSchools = await prisma.school.count({ where: { slug: { startsWith: runId } } });
  const remainingWebhook = await prisma.asaasWebhookEvent.count({ where: { externalEventId: tempExternalEventId } });
  assertCheck(remainingSchools === 0 && remainingWebhook === 0, "Cleanup deve remover 0 registros temporarios restantes.");

  if (failures.length) {
    throw new Error(failures.map((failure) => `- ${failure}`).join("\n"));
  }

  console.log("Homologacao de auditoria institucional concluida com sucesso.");
}

main()
  .catch(async (error) => {
    await cleanup().catch(() => undefined);
    console.error("Homologacao de auditoria institucional falhou:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
