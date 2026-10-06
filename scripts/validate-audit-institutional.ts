import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`Arquivo ausente: ${relativePath}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function assertCheck(condition: unknown, message: string) {
  if (!condition) failures.push(message);
}

function includesAll(source: string, values: string[], context: string) {
  for (const value of values) {
    assertCheck(source.includes(value), `${context}: nao encontrou "${value}"`);
  }
}

function walkFiles(dir: string, extension: string, result: string[] = []) {
  if (!existsSync(dir)) return result;
  for (const item of readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, extension, result);
    } else if (fullPath.endsWith(extension)) {
      result.push(fullPath);
    }
  }
  return result;
}

const schema = read("prisma/schema.prisma");
includesAll(
  schema,
  [
    "enum AuditSource",
    "actorRole UserRole?",
    "source    AuditSource",
    "before    Json?",
    "after     Json?",
    "metadata  Json?",
    "@@index([schoolId, action, createdAt])",
    "@@index([schoolId, entity, createdAt])",
    "@@index([schoolId, source, createdAt])"
  ],
  "schema AuditLog"
);

const migration = read("prisma/migrations/20261005133000_add_institutional_audit/migration.sql");
includesAll(
  migration,
  [
    'CREATE TYPE "AuditSource"',
    'ADD COLUMN "actorRole"',
    'ADD COLUMN "source"',
    'ADD COLUMN "before" JSONB',
    'ADD COLUMN "after" JSONB',
    'ADD COLUMN "metadata" JSONB'
  ],
  "migration auditoria"
);

const auditHelper = read("src/lib/audit.ts");
includesAll(
  auditHelper,
  [
    "server-only",
    "typeof window",
    "FORBIDDEN_KEY_PATTERN",
    "SENSITIVE_KEY_PATTERN",
    "passwordHash",
    "accessToken",
    "refreshToken",
    "maskCpf",
    "maskEmail",
    "maskPhone",
    "sanitizeAuditValue",
    "buildAuditDiff",
    "auditSourceFromRole",
    "recordAuditLog"
  ],
  "helper central"
);

const forbiddenDirectWrites = walkFiles(path.join(root, "src"), ".ts")
  .concat(walkFiles(path.join(root, "src"), ".tsx"))
  .filter((file) => !file.endsWith(path.join("src", "lib", "audit.ts")))
  .filter((file) => readFileSync(file, "utf8").includes("auditLog.create"));
assertCheck(
  forbiddenDirectWrites.length === 0,
  `AuditLog deve ser gravado pelo helper central. Escritas diretas: ${forbiddenDirectWrites.map((file) => path.relative(root, file)).join(", ")}`
);

const academicActions = read("src/app/actions/academic.ts");
includesAll(
  academicActions,
  [
    "academic_period.closed",
    "academic_period.reopened",
    "academic_year.closed",
    "grade.created",
    "grade.updated",
    "attendance.created",
    "attendance.updated",
    "class_diary.created",
    "class_diary.updated",
    "teacher_assignment.created",
    "teacher_assignment.deleted",
    "subject.created",
    "announcement.created",
    "calendar_event.created",
    "student_import.completed"
  ],
  "actions academicas/admin"
);

const authActions = read("src/app/actions/auth.ts");
includesAll(authActions, ["auth.login_failed", "auth.login_success", "auth.logout"], "actions de autenticacao");

const documentRoute = read("src/app/api/documentos/[tipo]/route.ts");
includesAll(documentRoute, ["document.generated", "historico", "declaracao-matricula", "boletim"], "documentos PDF");

const guardianService = read("src/services/guardian-management.ts");
includesAll(guardianService, ["guardian.updated", "buildAuditDiff", "recordAuditLog"], "responsaveis");

const enrollmentService = read("src/services/enrollment-registration.ts");
includesAll(enrollmentService, ["enrollment.created", "recordAuditLog"], "matriculas");

const financialService = read("src/services/financial.ts");
includesAll(
  financialService,
  ["recordFinancialAudit", "chargeFinancialEvent", "collectionAction", "billingAutomationRun", "asaasWebhookEvent"],
  "financeiro"
);

const auditService = read("src/services/audit-log.ts");
includesAll(
  auditService,
  ["schoolId", "PAGE_SIZE", "skip:", "take: PAGE_SIZE", "validAuditSource", "distinct"],
  "consulta multi-tenant/paginada"
);

const auditPage = read("src/app/admin/configuracoes/auditoria/page.tsx");
includesAll(
  auditPage,
  [
    "requireSession([\"ADMIN\"])",
    "listInstitutionalAuditLogs",
    "name=\"inicio\"",
    "name=\"fim\"",
    "name=\"usuario\"",
    "name=\"origem\"",
    "name=\"acao\"",
    "name=\"entidade\"",
    "name=\"entidadeId\"",
    "AuditValueList",
    "audit.page"
  ],
  "tela admin auditoria"
);

const labels = read("src/lib/admin-labels.ts");
includesAll(
  labels,
  ["auditActionLabel", "auditEntityLabel", "auditSourceLabel", "grade.updated", "attendance.updated", "document.generated"],
  "labels humanos"
);

const settingsPage = read("src/app/admin/configuracoes/page.tsx");
includesAll(settingsPage, ["/admin/configuracoes/auditoria", "Auditoria completa"], "entrada em configuracoes");

if (failures.length) {
  console.error("Validacao de auditoria institucional falhou:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Validacao de auditoria institucional concluida com sucesso.");
