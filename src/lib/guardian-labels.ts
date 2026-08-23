import type {
  AnnouncementAudience,
  AttendanceStatus,
  CalendarEventType,
  EnrollmentStatus,
  Shift
} from "@prisma/client";
import { schoolConfig } from "@/config/school";
import { visibleGrade } from "@/lib/academic-rules";
import { announcementAudienceLabel } from "@/lib/announcements";
import { calendarEventTypeLabel } from "@/lib/calendar-events";

export function guardianInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function guardianFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

export function guardianAudienceLabel(value: AnnouncementAudience | string) {
  return announcementAudienceLabel(value);
}

export function guardianEventTypeLabel(value: CalendarEventType | string) {
  return calendarEventTypeLabel(value);
}

export function guardianAttendanceLabel(value: AttendanceStatus | string) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Ausente",
    JUSTIFIED: "Justificado"
  };

  return labels[value] ?? value;
}

export function guardianShiftLabel(value: Shift | string) {
  const labels: Record<string, string> = {
    MATUTINO: "Matutino",
    VESPERTINO: "Vespertino",
    NOTURNO: "Noturno",
    INTEGRAL: "Integral"
  };

  return labels[value] ?? value;
}

export function guardianEnrollmentStatusLabel(value: EnrollmentStatus | string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRANSFERRED: "Transferida",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada"
  };

  return labels[value] ?? value;
}

export function guardianCompactText(value: string, maxLength = 120) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function guardianAcademicTone(average: number) {
  const visibleAverage = visibleGrade(average);
  if (visibleAverage >= 8) return "Muito bom";
  if (visibleAverage >= schoolConfig.academic.passingGrade) return "Bom desempenho";
  if (visibleAverage >= schoolConfig.academic.recoveryGrade) return "Atenção";
  if (visibleAverage > 0) return "Precisa de apoio";
  return "Cursando";
}
