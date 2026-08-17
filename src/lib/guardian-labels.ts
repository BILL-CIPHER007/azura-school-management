import type {
  AnnouncementAudience,
  AttendanceStatus,
  CalendarEventType,
  EnrollmentStatus,
  Shift
} from "@prisma/client";
import { schoolConfig } from "@/config/school";

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
  const labels: Record<string, string> = {
    SCHOOL: "Toda a escola",
    PROFESSORS: "Professores",
    STUDENTS: "Alunos",
    GUARDIANS: "Responsáveis",
    CLASSROOM: "Turma específica"
  };

  return labels[value] ?? value;
}

export function guardianEventTypeLabel(value: CalendarEventType | string) {
  const labels: Record<string, string> = {
    PROVA: "Prova",
    REUNIAO: "Reunião",
    EVENTO: "Evento",
    FERIADO: "Feriado",
    ATIVIDADE: "Atividade",
    PRAZO: "Prazo"
  };

  return labels[value] ?? value;
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
  if (average >= 8) return "Muito bom";
  if (average >= schoolConfig.academic.passingGrade) return "Bom desempenho";
  if (average >= schoolConfig.academic.recoveryGrade) return "Atenção";
  if (average > 0) return "Precisa de apoio";
  return "Cursando";
}
