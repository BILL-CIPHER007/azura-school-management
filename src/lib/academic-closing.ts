export type AcademicYearClosingLike = {
  closedAt?: Date | null;
};

export type AcademicPeriodClosingLike = {
  startsAt: Date;
  endsAt: Date;
  closedAt?: Date | null;
  academicYear?: AcademicYearClosingLike | null;
};

export type AcademicPeriodClosingState = {
  label: "Período encerrado" | "Período ainda não iniciado" | "Período em andamento" | "Pronto para fechamento";
  reason: "closed" | "not-started" | "in-progress" | "ready";
  canClose: boolean;
};

export function isAcademicYearClosed(academicYear?: AcademicYearClosingLike | null) {
  return Boolean(academicYear?.closedAt);
}

export function isAcademicPeriodClosed(period?: AcademicPeriodClosingLike | null) {
  return Boolean(period?.closedAt || period?.academicYear?.closedAt);
}

export function findAcademicPeriodForDate<T extends AcademicPeriodClosingLike>(periods: T[], date: Date) {
  return periods.find((period) => period.startsAt <= date && period.endsAt >= date) ?? null;
}

function dateOnlyTime(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function getAcademicPeriodClosingState(
  period: AcademicPeriodClosingLike,
  referenceDate = new Date()
): AcademicPeriodClosingState {
  if (isAcademicPeriodClosed(period)) {
    return { label: "Período encerrado", reason: "closed", canClose: false };
  }

  const today = dateOnlyTime(referenceDate);
  const startsAt = dateOnlyTime(period.startsAt);
  const endsAt = dateOnlyTime(period.endsAt);

  if (today < startsAt) {
    return { label: "Período ainda não iniciado", reason: "not-started", canClose: false };
  }

  if (today < endsAt) {
    return { label: "Período em andamento", reason: "in-progress", canClose: false };
  }

  return { label: "Pronto para fechamento", reason: "ready", canClose: true };
}

export function academicPeriodClosedMessage(periodName?: string) {
  return periodName
    ? `O período ${periodName} está encerrado para lançamentos.`
    : "Este período está encerrado para lançamentos.";
}
