import assert from "node:assert/strict";
import { checkActiveStudentLimit, getPlanConfig, hasCommercialFeature } from "../src/lib/commercial-plans";

assert.equal(getPlanConfig("ESSENCIAL").maxActiveStudents, 200);
assert.equal(getPlanConfig("PROFISSIONAL").maxActiveStudents, 500);

assert.equal(hasCommercialFeature("ESSENCIAL", "academicCore"), true);
assert.equal(hasCommercialFeature("ESSENCIAL", "studentCsvImport"), true);
assert.equal(hasCommercialFeature("ESSENCIAL", "financialModule"), false);
assert.equal(hasCommercialFeature("ESSENCIAL", "finance"), false);
assert.equal(hasCommercialFeature("ESSENCIAL", "billing"), false);
assert.equal(hasCommercialFeature("PROFISSIONAL", "financialModule"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "finance"), true);
assert.equal(hasCommercialFeature("PROFISSIONAL", "billing"), true);

assert.deepEqual(checkActiveStudentLimit("ESSENCIAL", 199, 1), {
  allowed: true,
  currentActiveStudents: 199,
  incomingStudents: 1,
  maxActiveStudents: 200,
  exceededBy: 0
});

assert.deepEqual(checkActiveStudentLimit("ESSENCIAL", 200, 1), {
  allowed: false,
  currentActiveStudents: 200,
  incomingStudents: 1,
  maxActiveStudents: 200,
  exceededBy: 1
});

assert.deepEqual(checkActiveStudentLimit("PROFISSIONAL", 498, 2), {
  allowed: true,
  currentActiveStudents: 498,
  incomingStudents: 2,
  maxActiveStudents: 500,
  exceededBy: 0
});

assert.deepEqual(checkActiveStudentLimit("PROFISSIONAL", 499, 5), {
  allowed: false,
  currentActiveStudents: 499,
  incomingStudents: 5,
  maxActiveStudents: 500,
  exceededBy: 4
});

console.log("Commercial plan limits validated successfully.");
