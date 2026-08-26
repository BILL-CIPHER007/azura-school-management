import { strict as assert } from "node:assert";
import {
  getAcademicStatusFromSubjects,
  getOverallAverageFromSubjects,
  getSubjectAverages,
  isPassingVisibleGrade
} from "../src/lib/academic-rules";

function gradesBySubject(input: Record<string, Array<number | null | undefined>>) {
  return Object.entries(input).flatMap(([subject, values]) =>
    values.map((average) => ({
      average,
      subject: { name: subject }
    }))
  );
}

function summary(input: Record<string, Array<number | null | undefined>>) {
  const subjectAverages = getSubjectAverages(gradesBySubject(input));
  return {
    subjectAverages,
    averageGrade: getOverallAverageFromSubjects(subjectAverages)
  };
}

const scenarioA = summary({
  "Língua Portuguesa": [8],
  Matemática: [7.5],
  História: [7],
  Ciências: [9]
});
assert.equal(scenarioA.averageGrade, 7.875);
assert.equal(getAcademicStatusFromSubjects(scenarioA.subjectAverages, 95, { isFinal: false }), "Cursando");

const scenarioB = summary({
  "Língua Portuguesa": [9],
  Matemática: [9],
  História: [3],
  Ciências: [9]
});
assert.equal(scenarioB.averageGrade, 7.5);
assert.equal(getAcademicStatusFromSubjects(scenarioB.subjectAverages, 95, { isFinal: false }), "Recuperação");

const scenarioC = summary({
  Ciências: [7, 8, 6, 9],
  História: [6, 7]
});
assert.equal(scenarioC.subjectAverages.find((item) => item.subject === "Ciências")?.average, 7.5);
assert.equal(scenarioC.subjectAverages.find((item) => item.subject === "História")?.average, 6.5);
assert.equal(scenarioC.averageGrade, 7);

const scenarioD = summary({
  "Língua Portuguesa": [8],
  Matemática: [null],
  História: [7]
});
assert.equal(scenarioD.subjectAverages.length, 2);
assert.equal(scenarioD.averageGrade, 7.5);

assert.equal(getAcademicStatusFromSubjects(scenarioD.subjectAverages, 95, { isFinal: false }), "Cursando");
assert.equal(getAcademicStatusFromSubjects(scenarioB.subjectAverages, 95, { isFinal: true }), "Reprovado");
assert.equal(isPassingVisibleGrade(6.96), true);

console.log("Academic rule validation passed.");
