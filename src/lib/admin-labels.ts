import type {
  AnnouncementAudience,
  AttendanceStatus,
  CalendarEventType,
  EnrollmentStatus,
  Shift,
  UserRole,
  UserStatus
} from "@prisma/client";

export function adminInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function adminRoleLabel(role: UserRole | string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    PROFESSOR: "Professor",
    ALUNO: "Aluno",
    RESPONSAVEL: "Responsável"
  };

  return labels[role] ?? role;
}

export function userStatusLabel(value: UserStatus | string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo"
  };

  return labels[value] ?? value;
}

export function enrollmentStatusLabel(value?: EnrollmentStatus | string | null) {
  if (!value) return "Sem matrícula";
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRANSFERRED: "Transferida",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada"
  };

  return labels[value] ?? value;
}

export function enrollmentStatusTone(value?: EnrollmentStatus | string | null) {
  if (value === "ACTIVE") return "success";
  if (value === "TRANSFERRED") return "warning";
  if (value === "COMPLETED") return "info";
  if (value === "CANCELLED") return "danger";
  return "neutral";
}

export function userStatusTone(value?: UserStatus | string | null) {
  return value === "ACTIVE" ? "success" : "warning";
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

export function audienceLabel(value: AnnouncementAudience | string) {
  const labels: Record<string, string> = {
    SCHOOL: "Toda a escola",
    PROFESSORS: "Professores",
    STUDENTS: "Alunos",
    GUARDIANS: "Responsáveis",
    CLASSROOM: "Turma específica"
  };

  return labels[value] ?? value;
}

export function eventTypeLabel(value: CalendarEventType | string) {
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

export function attendanceStatusLabel(value: AttendanceStatus | string) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Ausente",
    JUSTIFIED: "Justificado"
  };

  return labels[value] ?? value;
}

export function auditActionLabel(value: string) {
  const labels: Record<string, string> = {
    "seed.executed": "Carga inicial executada",
    "enrollment.created": "Matrícula criada",
    "grade.upserted": "Nota registrada",
    "attendance.upserted": "Frequência registrada"
  };

  return labels[value] ?? value;
}

export function auditEntityLabel(value: string) {
  const labels: Record<string, string> = {
    School: "Escola",
    Enrollment: "Matrícula",
    Grade: "Nota",
    Attendance: "Frequência",
    Announcement: "Comunicado",
    CalendarEvent: "Evento"
  };

  return labels[value] ?? value;
}

export function academicSituationTone(value: string) {
  if (value === "Aprovado") return "success";
  if (value === "Recuperação") return "warning";
  if (value === "Reprovado") return "danger";
  return "info";
}
