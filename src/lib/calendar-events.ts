import type { CalendarEventType } from "@prisma/client";
import { formatDate } from "@/lib/utils";

const eventTypeLabels: Record<CalendarEventType | string, string> = {
  PROVA: "Prova",
  REUNIAO: "Reunião",
  EVENTO: "Evento",
  FERIADO: "Feriado",
  ATIVIDADE: "Atividade",
  PRAZO: "Prazo"
};

export type CalendarEventTimeLike = {
  startsAt: Date;
  startTime?: string | null;
  endTime?: string | null;
};

export function calendarEventTypeLabel(value: CalendarEventType | string) {
  return eventTypeLabels[value] ?? value;
}

export function hasExplicitEventTime(event: CalendarEventTimeLike) {
  return Boolean(event.startTime);
}

export function formatEventTime(event: Pick<CalendarEventTimeLike, "startTime" | "endTime">) {
  if (!event.startTime) return null;
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

export function formatEventDateTime(event: CalendarEventTimeLike, options: { allDayLabel?: boolean } = {}) {
  const time = formatEventTime(event);
  if (time) return `${formatDate(event.startsAt)} · ${time}`;
  return options.allDayLabel ? `${formatDate(event.startsAt)} · Dia inteiro` : formatDate(event.startsAt);
}

export function calendarDateFromInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function calendarDateTimeFromInput(date: string, time: string) {
  return new Date(`${date}T${time}:00.000`);
}

export function compareCalendarEvents<T extends CalendarEventTimeLike>(first: T, second: T) {
  return (
    first.startsAt.getTime() - second.startsAt.getTime() ||
    (first.startTime ?? "").localeCompare(second.startTime ?? "") ||
    (first.endTime ?? "").localeCompare(second.endTime ?? "") ||
    0
  );
}
