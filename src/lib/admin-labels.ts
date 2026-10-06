import type {
  AnnouncementAudience,
  AuditSource,
  AttendanceStatus,
  CalendarEventType,
  EnrollmentStatus,
  Shift,
  UserRole,
  UserStatus
} from "@prisma/client";
import { announcementAudienceLabel } from "@/lib/announcements";
import { calendarEventTypeLabel } from "@/lib/calendar-events";

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
  return announcementAudienceLabel(value);
}

export function eventTypeLabel(value: CalendarEventType | string) {
  return calendarEventTypeLabel(value);
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
    "student_import.enrollment_created": "Matrícula importada",
    "student_import.completed": "Importação de alunos concluída",
    "guardian.created": "Responsável criado",
    "guardian.updated": "Responsável atualizado",
    "teacher_assignment.created": "Atribuição criada",
    "teacher_assignment.deleted": "Atribuição removida",
    "grade.upserted": "Nota registrada",
    "grade.created": "Nota registrada",
    "grade.updated": "Nota alterada",
    "attendance.upserted": "Frequência registrada",
    "attendance.created": "Frequência registrada",
    "attendance.updated": "Frequência alterada",
    "class_diary.created": "Diário de classe registrado",
    "class_diary.updated": "Diário de classe alterado",
    "academic_period.closed": "Período fechado",
    "academic_period.reopened": "Período reaberto",
    "academic_year.closed": "Ano letivo encerrado",
    "subject.created": "Disciplina criada",
    "announcement.created": "Comunicado publicado",
    "calendar_event.created": "Evento criado",
    "document.generated": "Documento emitido",
    "auth.login_success": "Login realizado",
    "auth.login_failed": "Falha de login",
    "auth.logout": "Logout realizado",
    "financial_charge.created": "Cobrança criada",
    "financial_charge.updated": "Cobrança atualizada",
    "financial_charge.external_payment_created": "Pagamento externo criado",
    "financial_charge.manual_payment": "Pagamento manual registrado",
    "financial_charge.canceled": "Cobrança cancelada",
    "financial_charge.external_canceled": "Cobrança externa cancelada",
    "financial_charge.reconciled": "Cobrança conciliada",
    "financial_charge.refund_requested": "Reembolso solicitado",
    "financial_charge.webhook_paid": "Webhook confirmou pagamento",
    "financial_charge.webhook_canceled": "Webhook cancelou cobrança",
    "financial_charge.webhook_refunded": "Webhook confirmou reembolso",
    "billing_rule.created": "Regra de mensalidade criada",
    "billing_rule.updated": "Regra de mensalidade atualizada",
    "billing_batch.generated": "Lote de mensalidades gerado",
    "billing_batch.pix_issued": "Pix emitido em lote",
    "billing_batch.boleto_issued": "Boleto emitido em lote"
  };

  return labels[value] ?? value;
}

export function auditEntityLabel(value: string) {
  const labels: Record<string, string> = {
    School: "Escola",
    Enrollment: "Matrícula",
    Guardian: "Responsável",
    TeacherSubject: "Atribuição",
    Subject: "Disciplina",
    Grade: "Nota",
    Attendance: "Frequência",
    Announcement: "Comunicado",
    CalendarEvent: "Evento",
    ClassDiaryEntry: "Diário de classe",
    AcademicPeriod: "Período acadêmico",
    AcademicYear: "Ano letivo",
    Charge: "Cobrança",
    BillingRule: "Regra de mensalidade",
    BillingBatch: "Lote de mensalidades",
    User: "Usuário"
  };

  return labels[value] ?? value;
}

export function auditSourceLabel(value?: AuditSource | string | null) {
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    PROFESSOR: "Professor",
    ALUNO: "Aluno",
    RESPONSAVEL: "Responsável",
    SYSTEM: "Sistema",
    CRON: "Rotina automática",
    WEBHOOK: "Webhook",
    PROVIDER: "Provedor"
  };

  return value ? labels[value] ?? value : "-";
}

export function academicSituationTone(value: string) {
  if (value === "Aprovado") return "success";
  if (value === "Recuperação") return "warning";
  if (value === "Reprovado") return "danger";
  return "info";
}
