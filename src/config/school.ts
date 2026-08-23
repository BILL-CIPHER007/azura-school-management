import type { UserRole } from "@prisma/client";

export type SchoolBranding = {
  logo: string | null;
  logoCompact: string | null;
  logoHorizontal: string | null;
  favicon: string;
};

export type SchoolTheme = {
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  primarySoft: string;
  accent: string;
  accentForeground: string;
  navy: string;
  blue700: string;
  blue500: string;
  blue100: string;
};

export type AcademicConfig = {
  academicYear: number;
  gradingSystem: "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL";
  passingGrade: number;
  recoveryGrade: number;
  minimumAttendance: number;
  periodNames: string[];
  defaultEnrollmentDate: string;
  defaultCalendarEventDate: string;
  teacherDefaultAttendanceDate: string;
};

export type FeatureConfig = {
  grades: boolean;
  attendance: boolean;
  announcements: boolean;
  calendar: boolean;
};

export type DemoConfig = {
  isDemo: boolean;
  showDemoMetrics: boolean;
  badgeLabel: string;
  quickAccessEnabled: boolean;
  emailDomain: string;
  passwordFallback: string;
  users: Record<UserRole, string>;
  metrics: Array<{ value: string; label: string }>;
};

export type SchoolConfig = {
  name: string;
  shortName: string;
  initials: string;
  description: string;
  landingTitle: string;
  landingSubtitle: string;
  branding: SchoolBranding;
  theme: SchoolTheme;
  academic: AcademicConfig;
  features: FeatureConfig;
  demo: DemoConfig;
};

const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Colégio Aprovação";
const schoolShortName = process.env.NEXT_PUBLIC_SCHOOL_SHORT_NAME || "Aprovação";
const schoolInitials = process.env.NEXT_PUBLIC_SCHOOL_INITIALS || "CA";

export const schoolConfig: SchoolConfig = {
  name: schoolName,
  shortName: schoolShortName,
  initials: schoolInitials,
  description: "Portal escolar integrado do Colégio Aprovação.",
  landingTitle: `Bem-vindo ao ${schoolName}`,
  landingSubtitle: "Gestão escolar, acompanhamento acadêmico e comunicação em um só lugar.",
  branding: {
    logo: "/branding/logo.svg",
    logoCompact: "/branding/logo-compact.svg",
    logoHorizontal: "/branding/logo-horizontal.svg",
    favicon: "/branding/logo-compact.svg"
  },
  theme: {
    primary: "221 82% 47%",
    primaryForeground: "0 0% 100%",
    primaryHover: "220 83% 40%",
    primarySoft: "220 100% 96%",
    accent: "217 100% 96%",
    accentForeground: "217 78% 20%",
    navy: "217 78% 20%",
    blue700: "217 74% 35%",
    blue500: "219 77% 54%",
    blue100: "217 100% 96%"
  },
  academic: {
    academicYear: 2026,
    gradingSystem: "BIMESTRAL",
    passingGrade: 7,
    recoveryGrade: 5,
    minimumAttendance: 75,
    periodNames: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"],
    defaultEnrollmentDate: "2026-08-13",
    defaultCalendarEventDate: "2026-08-20",
    teacherDefaultAttendanceDate: "2026-08-13"
  },
  features: {
    grades: true,
    attendance: true,
    announcements: true,
    calendar: true
  },
  demo: {
    isDemo: true,
    showDemoMetrics: true,
    badgeLabel: "Ambiente de demonstração",
    quickAccessEnabled: true,
    emailDomain: "demo.aprovacao.local",
    passwordFallback: "demo123",
    users: {
      ADMIN: "admin@demo.aprovacao.local",
      PROFESSOR: "professor@demo.aprovacao.local",
      ALUNO: "aluno@demo.aprovacao.local",
      RESPONSAVEL: "responsavel@demo.aprovacao.local"
    },
    metrics: [
      { value: "30+", label: "alunos na demo" },
      { value: "4", label: "turmas ativas" },
      { value: "6", label: "disciplinas base" }
    ]
  }
};

export function getDemoPassword() {
  return process.env.DEMO_PASSWORD ?? schoolConfig.demo.passwordFallback;
}
