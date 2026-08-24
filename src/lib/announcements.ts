import type { AnnouncementAudience, Prisma } from "@prisma/client";

export const announcementAudienceLabels: Record<AnnouncementAudience, string> = {
  SCHOOL: "Toda a escola",
  PROFESSORS: "Professores",
  STUDENTS: "Alunos",
  GUARDIANS: "Responsáveis",
  CLASSROOM: "Turma específica"
};

export function announcementAudienceLabel(value: AnnouncementAudience | string) {
  return announcementAudienceLabels[value as AnnouncementAudience] ?? value;
}

export function announcementCanUseClassroom(audience: AnnouncementAudience) {
  return audience !== "SCHOOL";
}

export function announcementRequiresClassroom(audience: AnnouncementAudience) {
  return audience === "CLASSROOM";
}

export function announcementScopeLabel(announcement: {
  audience: AnnouncementAudience | string;
  classroom?: { name: string } | null;
}) {
  if (announcement.classroom) return announcement.classroom.name;
  return announcement.audience === "SCHOOL" ? "Toda a escola" : "Todas as turmas";
}

export function announcementSenderName(announcement: { author?: { name: string } | null }) {
  const name = announcement.author?.name?.trim();
  if (!name || name.toLowerCase().startsWith("secretaria")) return "Secretaria";
  return name;
}

export function teacherAnnouncementWhere(schoolId: string, classroomIds: string[]): Prisma.AnnouncementWhereInput {
  const scopedClassroomIds = [...new Set(classroomIds.filter(Boolean))];

  return {
    schoolId,
    OR: [
      { audience: "SCHOOL", classroomId: null },
      { audience: "PROFESSORS", classroomId: null },
      ...(scopedClassroomIds.length
        ? [
            { audience: "PROFESSORS" as const, classroomId: { in: scopedClassroomIds } },
            { audience: "CLASSROOM" as const, classroomId: { in: scopedClassroomIds } }
          ]
        : [])
    ]
  };
}

export function studentAnnouncementWhere(
  schoolId: string,
  classroomId?: string | null
): Prisma.AnnouncementWhereInput {
  return {
    schoolId,
    OR: [
      { audience: "SCHOOL", classroomId: null },
      { audience: "STUDENTS", classroomId: null },
      ...(classroomId
        ? [
            { audience: "STUDENTS" as const, classroomId },
            { audience: "CLASSROOM" as const, classroomId }
          ]
        : [])
    ]
  };
}

export function guardianAnnouncementWhere(
  schoolId: string,
  classroomId?: string | null
): Prisma.AnnouncementWhereInput {
  return {
    schoolId,
    OR: [
      { audience: "SCHOOL", classroomId: null },
      { audience: "GUARDIANS", classroomId: null },
      ...(classroomId
        ? [
            { audience: "GUARDIANS" as const, classroomId },
            { audience: "CLASSROOM" as const, classroomId }
          ]
        : [])
    ]
  };
}
