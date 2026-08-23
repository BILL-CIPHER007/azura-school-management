import type { AnnouncementAudience, AttendanceStatus, CalendarEventType, Shift } from "@prisma/client";
import { announcementAudienceLabel } from "@/lib/announcements";
import { calendarEventTypeLabel } from "@/lib/calendar-events";

export function audienceLabel(value: AnnouncementAudience | string) {
  return announcementAudienceLabel(value);
}

export function eventTypeLabel(value: CalendarEventType | string) {
  return calendarEventTypeLabel(value);
}

export function attendanceLabel(value: AttendanceStatus | string) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Ausente",
    JUSTIFIED: "Justificado"
  };

  return labels[value] ?? value;
}

export function shiftLabel(value: Shift | string) {
  const labels: Record<string, string> = {
    MATUTINO: "Matutino",
    VESPERTINO: "Vespertino",
    NOTURNO: "Noturno",
    INTEGRAL: "Integral"
  };

  return labels[value] ?? value;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function firstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

export function lessonTime(index: number) {
  const times = ["08:00 - 08:50", "09:00 - 09:50", "10:10 - 11:00", "11:10 - 12:00"];
  return times[index % times.length];
}

export function nextLessonLabel(index: number) {
  const labels = ["Segunda-feira · 08:00", "Terça-feira · 09:00", "Quarta-feira · 10:10", "Quinta-feira · 11:10"];
  return labels[index % labels.length];
}
