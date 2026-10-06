import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getCommercialPrice,
  getStudentCapacityLimit,
  getStudentUsage,
  hasCommercialFeature
} from "../src/lib/commercial-plans";

assert.equal(hasCommercialFeature("ESSENCIAL", "academicCore"), true);
assert.equal(hasCommercialFeature("ESSENCIAL", "studentCsvImport"), true);
assert.equal(hasCommercialFeature("ESSENCIAL", "financialModule"), false);
assert.equal(hasCommercialFeature("ESSENCIAL", "finance"), false);
assert.equal(hasCommercialFeature("ESSENCIAL", "billing"), false);

assert.equal(hasCommercialFeature("PROFISSIONAL", "academicCore"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "studentCsvImport"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "financialModule"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "finance"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "billing"), true);

assert.equal(getStudentCapacityLimit("UP_TO_200"), 200);
assert.equal(getStudentCapacityLimit("UP_TO_300"), 300);
assert.equal(getStudentCapacityLimit("UP_TO_500"), 500);
assert.equal(getStudentCapacityLimit("CUSTOM"), null);

assert.deepEqual(getStudentUsage(150, "UP_TO_200"), {
  capacity: "UP_TO_200",
  label: "Até 200 alunos",
  shortLabel: "Até 200",
  currentActiveStudents: 150,
  incomingStudents: 0,
  projectedActiveStudents: 150,
  maxActiveStudents: 200,
  usagePercent: 75,
  exceededBy: 0,
  status: "NORMAL",
  isLimited: true
});

assert.equal(getStudentUsage(180, "UP_TO_200").status, "WARNING");
assert.equal(getStudentUsage(200, "UP_TO_200").status, "LIMIT_REACHED");
assert.equal(getStudentUsage(205, "UP_TO_200").status, "OVER_CAPACITY");
assert.equal(getStudentUsage(205, "UP_TO_200").exceededBy, 5);

assert.deepEqual(getStudentUsage(750, "CUSTOM", 25), {
  capacity: "CUSTOM",
  label: "Capacidade personalizada",
  shortLabel: "Personalizada",
  currentActiveStudents: 750,
  incomingStudents: 25,
  projectedActiveStudents: 775,
  maxActiveStudents: null,
  usagePercent: null,
  exceededBy: 0,
  status: "NORMAL",
  isLimited: false
});

assert.equal(getCommercialPrice("ESSENCIAL", "UP_TO_200").monthly, 490);
assert.equal(getCommercialPrice("ESSENCIAL", "UP_TO_300").implementation, 1800);
assert.equal(getCommercialPrice("PROFISSIONAL", "UP_TO_500").monthly, 990);
assert.equal(getCommercialPrice("PROFISSIONAL", "CUSTOM").monthly, null);

const enrollmentRegistration = readFileSync("src/services/enrollment-registration.ts", "utf8");
const academicActions = readFileSync("src/app/actions/academic.ts", "utf8");

assert.equal(
  enrollmentRegistration.includes("throw new EnrollmentRegistrationError(\"limite-alunos-ativos\""),
  false,
  "Enrollment registration must not block creation by commercial capacity."
);
assert.equal(
  academicActions.includes("!capacity.allowed"),
  false,
  "CSV import must not block confirmation by commercial capacity."
);

console.log("Commercial capacity rules validated successfully.");
