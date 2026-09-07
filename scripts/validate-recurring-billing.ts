import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  billingCompetenceLabel,
  dueDateFromBillingCompetence,
  normalizeBillingCompetence,
  toCivilDateKey
} from "../src/lib/financial-core";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "migrations", "20260907120000_add_recurring_billing", "migration.sql"),
  "utf8"
);
const financialService = readFileSync(join(root, "src", "services", "financial.ts"), "utf8");

assert.equal(normalizeBillingCompetence("2026-09"), "2026-09");
assert.equal(normalizeBillingCompetence("2026-9"), null);
assert.equal(normalizeBillingCompetence("2026-13"), null);
assert.equal(normalizeBillingCompetence("1999-12"), null);
assert.equal(billingCompetenceLabel("2026-09"), "09/2026");
assert.equal(billingCompetenceLabel("invalid"), "invalid");

const leapDueDate = dueDateFromBillingCompetence("2028-02", 31);
assert.ok(leapDueDate);
assert.equal(toCivilDateKey(leapDueDate), "2028-02-29");

const regularDueDate = dueDateFromBillingCompetence("2026-04", 30);
assert.ok(regularDueDate);
assert.equal(toCivilDateKey(regularDueDate), "2026-04-30");

assert.match(schema, /enum BillingTargetScope/);
assert.match(schema, /model BillingRule/);
assert.match(schema, /model BillingBatch/);
assert.match(schema, /@@unique\(\[schoolId, studentId, billingRuleId, competence\]\)/);
assert.match(schema, /@@unique\(\[schoolId, billingRuleId, competence\]\)/);

assert.match(migration, /CREATE TYPE "BillingTargetScope"/);
assert.match(migration, /ALTER TABLE "Charge" ADD COLUMN "billingRuleId"/);
assert.match(migration, /CREATE TABLE "BillingRule"/);
assert.match(migration, /CREATE TABLE "BillingBatch"/);
assert.match(migration, /CREATE UNIQUE INDEX "Charge_schoolId_studentId_billingRuleId_competence_key"/);
assert.match(migration, /CREATE UNIQUE INDEX "BillingBatch_schoolId_billingRuleId_competence_key"/);

assert.match(financialService, /await assertFinancialFeature\(schoolId/);
assert.match(financialService, /function assertBillingRuleCoversDueDate/);
assert.match(financialService, /billingRuleId: rule\.id/);
assert.match(financialService, /competence: preview\.competence/);
assert.match(financialService, /guardianId: row\.guardianId/);
assert.match(financialService, /isUniqueConstraintError/);

const generateBatchStart = financialService.indexOf("export async function generateBillingBatch");
const emitBatchStart = financialService.indexOf("export async function emitBillingBatchPayments");
assert.ok(generateBatchStart >= 0);
assert.ok(emitBatchStart > generateBatchStart);
const generateBatchBlock = financialService.slice(generateBatchStart, emitBatchStart);
assert.doesNotMatch(generateBatchBlock, /generateExternalPayment/);

console.log("Recurring billing validated successfully.");
