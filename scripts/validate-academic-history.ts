import { strict as assert } from "node:assert";
import { buildStudentAcademicHistory, type AcademicHistorySource } from "../src/lib/academic-history";

const subjects = {
  portuguese: { id: "subject-portuguese", name: "Língua Portuguesa" },
  math: { id: "subject-math", name: "Matemática" },
  science: { id: "subject-science", name: "Ciências" }
};

const periods2025 = [
  { id: "period-2025-1", name: "1º Bimestre", sortOrder: 1, closedAt: new Date("2025-04-30T12:00:00.000Z") },
  { id: "period-2025-2", name: "2º Bimestre", sortOrder: 2, closedAt: new Date("2025-06-30T12:00:00.000Z") }
];
const periods2026 = [
  { id: "period-2026-1", name: "1º Bimestre", sortOrder: 1, closedAt: null },
  { id: "period-2026-2", name: "2º Bimestre", sortOrder: 2, closedAt: null }
];

const source: AcademicHistorySource = {
  id: "student-1",
  fullName: "João Rodrigues",
  enrollments: [
    {
      id: "enrollment-2025",
      registration: "20250001",
      enrolledAt: new Date("2025-01-20T12:00:00.000Z"),
      status: "COMPLETED",
      academicYear: {
        id: "year-2025",
        year: 2025,
        closedAt: new Date("2025-12-20T12:00:00.000Z"),
        periods: periods2025
      },
      classroom: {
        id: "classroom-2025",
        name: "5º Ano A",
        gradeLevel: "5º Ano",
        shift: "MATUTINO",
        assignments: [
          { subject: subjects.portuguese },
          { subject: subjects.math }
        ]
      },
      grades: [
        {
          id: "grade-1",
          average: 8,
          subject: subjects.portuguese,
          academicPeriod: periods2025[0]
        },
        {
          id: "grade-2",
          average: 8.5,
          subject: subjects.portuguese,
          academicPeriod: periods2025[1]
        },
        {
          id: "grade-3",
          average: 7,
          subject: subjects.math,
          academicPeriod: periods2025[0]
        },
        {
          id: "grade-4",
          average: 7.5,
          subject: subjects.math,
          academicPeriod: periods2025[1]
        }
      ],
      attendances: [
        { id: "attendance-1", status: "PRESENT", date: new Date("2025-03-01T12:00:00.000Z"), subject: subjects.portuguese },
        { id: "attendance-2", status: "PRESENT", date: new Date("2025-03-02T12:00:00.000Z"), subject: subjects.portuguese },
        { id: "attendance-3", status: "PRESENT", date: new Date("2025-03-03T12:00:00.000Z"), subject: subjects.math },
        { id: "attendance-4", status: "PRESENT", date: new Date("2025-03-04T12:00:00.000Z"), subject: subjects.math }
      ]
    },
    {
      id: "enrollment-2026",
      registration: "20260001",
      enrolledAt: new Date("2026-01-20T12:00:00.000Z"),
      status: "ACTIVE",
      academicYear: {
        id: "year-2026",
        year: 2026,
        closedAt: null,
        periods: periods2026
      },
      classroom: {
        id: "classroom-2026",
        name: "6º Ano A",
        gradeLevel: "6º Ano",
        shift: "MATUTINO",
        assignments: [
          { subject: subjects.portuguese },
          { subject: subjects.math },
          { subject: subjects.science }
        ]
      },
      grades: [
        {
          id: "grade-5",
          average: 6.5,
          subject: subjects.portuguese,
          academicPeriod: periods2026[0]
        },
        {
          id: "grade-6",
          average: 8,
          subject: subjects.math,
          academicPeriod: periods2026[0]
        }
      ],
      attendances: [
        { id: "attendance-5", status: "PRESENT", date: new Date("2026-03-01T12:00:00.000Z"), subject: subjects.portuguese },
        { id: "attendance-6", status: "ABSENT", date: new Date("2026-03-02T12:00:00.000Z"), subject: subjects.portuguese },
        { id: "attendance-7", status: "PRESENT", date: new Date("2026-03-03T12:00:00.000Z"), subject: subjects.math },
        { id: "attendance-8", status: "PRESENT", date: new Date("2026-03-04T12:00:00.000Z"), subject: subjects.math }
      ]
    }
  ]
};

const history = buildStudentAcademicHistory(source);
const currentYear = history.enrollments[0];
const closedYear = history.enrollments[1];
const science = currentYear.subjects.find((subject) => subject.id === subjects.science.id);
const portuguese = currentYear.subjects.find((subject) => subject.id === subjects.portuguese.id);

assert.equal(history.enrollments.length, 2, "H1: aluno com dois anos letivos deve retornar dois registros.");
assert.equal(history.enrollments[0].academicYear.year, 2026, "Anos devem vir do mais recente para o mais antigo.");
assert.equal(closedYear.isClosed, true, "H2: ano encerrado deve ser identificado por closedAt.");
assert.equal(closedYear.situation, "Aprovado", "H2: ano encerrado deve exibir situação final correta.");
assert.notEqual(currentYear.situation, "Aprovado", "H3: ano aberto não deve exibir aprovação final.");
assert.notEqual(currentYear.situation, "Reprovado", "H3: ano aberto não deve exibir reprovação final.");
assert.equal(portuguese?.average, 6.5, "H4: disciplina abaixo da média deve aparecer no histórico.");
assert.equal(science?.average, null, "H5: disciplina sem nota deve ficar sem média, não como zero.");
assert.equal(currentYear.generalAverage, 7.3, "H5: média geral deve ignorar disciplina sem nota.");
assert.equal(currentYear.situation, "Recuperação", "H6: frequência ou disciplina insuficiente deve respeitar regra acadêmica.");

console.log("Academic history validation passed.");
