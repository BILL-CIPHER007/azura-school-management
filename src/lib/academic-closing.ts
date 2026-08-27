export type AcademicYearClosingLike = {
  closedAt?: Date | null;
};

export type AcademicPeriodClosingLike = {
  startsAt: Date;
  endsAt: Date;
  closedAt?: Date | null;
  academicYear?: AcademicYearClosingLike | null;
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

export function academicPeriodClosedMessage(periodName?: string) {
  return periodName
    ? `O período ${periodName} está encerrado para lançamentos.`
    : "Este período está encerrado para lançamentos.";
}
