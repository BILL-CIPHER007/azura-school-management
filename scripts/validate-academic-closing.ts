import {
  findAcademicPeriodForDate,
  getAcademicPeriodClosingState,
  isAcademicPeriodClosed,
  isAcademicYearClosed
} from "../src/lib/academic-closing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const openYear = { closedAt: null };
const closedYear = { closedAt: new Date("2026-12-20T12:00:00.000Z") };

const openPeriod = {
  startsAt: new Date("2026-02-01T12:00:00.000Z"),
  endsAt: new Date("2026-04-30T12:00:00.000Z"),
  closedAt: null,
  academicYear: openYear
};

const closedPeriod = {
  ...openPeriod,
  closedAt: new Date("2026-05-01T12:00:00.000Z")
};

const referenceDate = new Date("2026-08-27T12:00:00.000Z");
const futurePeriod = {
  startsAt: new Date("2026-10-10T12:00:00.000Z"),
  endsAt: new Date("2026-12-20T12:00:00.000Z"),
  closedAt: null,
  academicYear: openYear
};
const inProgressPeriod = {
  startsAt: new Date("2026-08-01T12:00:00.000Z"),
  endsAt: new Date("2026-10-09T12:00:00.000Z"),
  closedAt: null,
  academicYear: openYear
};
const readyPeriod = {
  startsAt: new Date("2026-06-01T12:00:00.000Z"),
  endsAt: new Date("2026-08-27T12:00:00.000Z"),
  closedAt: null,
  academicYear: openYear
};

assert(!isAcademicYearClosed(openYear), "Ano sem closedAt deve permanecer aberto.");
assert(isAcademicYearClosed(closedYear), "Ano com closedAt deve ser encerrado.");
assert(!isAcademicPeriodClosed(openPeriod), "Periodo aberto em ano aberto deve permitir lancamentos.");
assert(isAcademicPeriodClosed(closedPeriod), "Periodo com closedAt deve bloquear lancamentos.");
assert(
  isAcademicPeriodClosed({ ...openPeriod, academicYear: closedYear }),
  "Periodo aberto em ano encerrado deve bloquear lancamentos."
);
assert(
  findAcademicPeriodForDate([openPeriod], new Date("2026-03-10T12:00:00.000Z")) === openPeriod,
  "Data dentro do intervalo deve localizar o periodo."
);
assert(
  findAcademicPeriodForDate([openPeriod], new Date("2026-06-10T12:00:00.000Z")) === null,
  "Data fora do intervalo nao deve localizar periodo."
);
assert(
  getAcademicPeriodClosingState(futurePeriod, referenceDate).reason === "not-started",
  "Periodo futuro nao deve permitir fechamento antecipado."
);
assert(
  getAcademicPeriodClosingState(inProgressPeriod, referenceDate).reason === "in-progress",
  "Periodo em andamento nao deve permitir fechamento antes da data final."
);
assert(
  getAcademicPeriodClosingState(readyPeriod, referenceDate).canClose,
  "Periodo na data final deve ficar pronto para fechamento."
);

console.log("Academic closing rules validated.");
