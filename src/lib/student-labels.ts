import type {
  AnnouncementAudience,
  AttendanceStatus,
  CalendarEventType,
  EnrollmentStatus,
  Shift
} from "@prisma/client";

export function studentInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function studentFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

export function studentAudienceLabel(value: AnnouncementAudience | string) {
  const labels: Record<string, string> = {
    SCHOOL: "Toda a escola",
    PROFESSORS: "Professores",
    STUDENTS: "Alunos",
    GUARDIANS: "Responsáveis",
    CLASSROOM: "Turma específica"
  };

  return labels[value] ?? value;
}

export function studentEventTypeLabel(value: CalendarEventType | string) {
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

export function studentAttendanceLabel(value: AttendanceStatus | string) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Ausente",
    JUSTIFIED: "Justificado"
  };

  return labels[value] ?? value;
}

export function studentShiftLabel(value: Shift | string) {
  const labels: Record<string, string> = {
    MATUTINO: "Matutino",
    VESPERTINO: "Vespertino",
    NOTURNO: "Noturno",
    INTEGRAL: "Integral"
  };

  return labels[value] ?? value;
}

export function studentEnrollmentStatusLabel(value: EnrollmentStatus | string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRANSFERRED: "Transferida",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada"
  };

  return labels[value] ?? value;
}

export function compactText(value: string, maxLength = 120) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}
