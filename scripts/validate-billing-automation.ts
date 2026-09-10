import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  billingAutomationRunAtFromCompetence,
  dateFromCivilInput,
  getBillingAutomationCompetence,
  shouldRunBillingAutomationRule
} from "../src/lib/financial-core";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260909153000_add_billing_automation", "migration.sql"),
  "utf8"
);
const financialService = readFileSync(join(root, "src", "services", "financial.ts"), "utf8");
const financialActions = readFileSync(join(root, "src", "app", "actions", "financial.ts"), "utf8");
const route = readFileSync(
  join(root, "src", "app", "api", "internal", "billing", "run-recurring", "route.ts"),
  "utf8"
);
const recurringPage = readFileSync(join(root, "src", "app", "admin", "financeiro", "mensalidades", "page.tsx"), "utf8");
const vercelConfig = readFileSync(join(root, "vercel.json"), "utf8");

const activeAutoRule = {
  isActive: true,
  autoGenerate: true,
  generationDay: 9,
  dueDay: 10,
  startsOn: dateFromCivilInput("2026-01-01"),
  endsOn: dateFromCivilInput("2026-12-31")
};

assert.equal(shouldRunBillingAutomationRule(activeAutoRule, new Date("2026-09-09T15:00:00.000Z")), true);
assert.equal(
  shouldRunBillingAutomationRule({ ...activeAutoRule, generationDay: 10 }, new Date("2026-09-09T15:00:00.000Z")),
  false
);
assert.equal(shouldRunBillingAutomationRule({ ...activeAutoRule, isActive: false }, new Date("2026-09-09T15:00:00.000Z")), false);
assert.equal(
  shouldRunBillingAutomationRule({ ...activeAutoRule, autoGenerate: false }, new Date("2026-09-09T15:00:00.000Z")),
  false
);
assert.equal(
  shouldRunBillingAutomationRule(
    {
      ...activeAutoRule,
      startsOn: dateFromCivilInput("2026-10-01"),
      endsOn: dateFromCivilInput("2026-12-31")
    },
    new Date("2026-09-09T15:00:00.000Z")
  ),
  false
);
assert.equal(getBillingAutomationCompetence(new Date("2026-09-10T02:30:00.000Z")), "2026-09");
assert.equal(shouldRunBillingAutomationRule(activeAutoRule, new Date("2026-09-10T02:30:00.000Z")), true);
assert.equal(billingAutomationRunAtFromCompetence("2028-02", 31)?.toISOString(), "2028-02-29T09:00:00.000Z");

assert.match(schema, /enum BillingAutomationRunStatus/);
assert.match(schema, /enum BillingAutomationTrigger/);
assert.match(schema, /autoGenerate\s+Boolean\s+@default\(false\)/);
assert.match(schema, /generationDay\s+Int\s+@default\(1\)/);
assert.match(schema, /lastGeneratedCompetence\s+String\?/);
assert.match(schema, /nextGenerationAt\s+DateTime\?/);
assert.match(schema, /model BillingAutomationRun/);
assert.match(schema, /@@unique\(\[schoolId, studentId, billingRuleId, competence\]\)/);
assert.match(schema, /@@unique\(\[schoolId, billingRuleId, competence\]\)/);

assert.match(migration, /CREATE TYPE "BillingAutomationRunStatus"/);
assert.match(migration, /ALTER TABLE "BillingRule"/);
assert.match(migration, /CREATE TABLE "BillingAutomationRun"/);
assert.match(migration, /"BillingRule_generationDay_check"/);

assert.match(financialService, /function parseBillingRuleInput/);
assert.match(financialService, /autoGenerate/);
assert.match(financialService, /generationDay/);
assert.match(financialService, /getNextBillingAutomationRunAt/);
assert.match(financialService, /export async function runRecurringBillingAutomation/);
assert.match(financialService, /school: \{ plan: "PROFISSIONAL" \}/);
assert.match(financialService, /await assertFinancialFeature\(rule\.schoolId\)/);
assert.match(financialService, /status: "ACTIVE"/);
assert.match(financialService, /await tx\.billingBatch\.upsert/);
assert.match(financialService, /createManyAndReturn/);
assert.match(financialService, /skipDuplicates: true/);
assert.match(financialService, /amount: rule\.amount/);
assert.match(financialService, /catch \(error\)/);
assert.match(financialService, /Fora do dia programado ou da vigencia da regra/);
assert.match(financialService, /status: "SKIPPED"/);
assert.doesNotMatch(financialService, /const dueRules = rules\.filter/);
assert.match(financialService, /for \(const rule of rules\)/);

assert.match(financialActions, /runBillingAutomationNowAction/);
assert.match(financialActions, /bypassSchedule: true/);

assert.match(route, /BILLING_CRON_SECRET/);
assert.match(route, /authorization !== `Bearer \$\{secret\}`/);
assert.doesNotMatch(route, /schoolId/);

assert.match(vercelConfig, /"crons"/);
assert.match(vercelConfig, /"\/api\/internal\/billing\/run-recurring"/);

assert.match(recurringPage, /Gerar mensalidades automaticamente/);
assert.match(recurringPage, /Dia da geracao/);
assert.match(recurringPage, /Proxima geracao/);
assert.match(recurringPage, /Ultimo resultado/);
assert.match(recurringPage, /Executar geracao agora/);

console.log("Billing automation validated successfully.");
