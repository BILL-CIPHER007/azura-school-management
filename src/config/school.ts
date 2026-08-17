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
  accent: string;
  accentForeground: string;
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

const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Escola Demonstrativa";
const schoolShortName = process.env.NEXT_PUBLIC_SCHOOL_SHORT_NAME || "Escola Demo";
const schoolInitials = process.env.NEXT_PUBLIC_SCHOOL_INITIALS || "ED";

export const schoolConfig: SchoolConfig = {
  name: schoolName,
  shortName: schoolShortName,
  initials: schoolInitials,
  description: "Portal acadêmico e gestão escolar em um só lugar.",
  landingTitle: schoolName,
  landingSubtitle:
    "Acompanhe matrículas, turmas, notas, frequência e comunicação entre escola, professores, alunos e responsáveis.",
  branding: {
    logo: "/branding/logo.svg",
    logoCompact: "/branding/logo-compact.svg",
    logoHorizontal: "/branding/logo-horizontal.svg",
    favicon: "/branding/logo-compact.svg"
  },
  theme: {
    primary: "207 72% 39%",
    primaryForeground: "0 0% 100%",
    accent: "156 45% 92%",
    accentForeground: "160 51% 21%"
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
    emailDomain: "demo.escola.local",
    passwordFallback: "demo123",
    users: {
      ADMIN: "admin@demo.escola.local",
      PROFESSOR: "professor@demo.escola.local",
      ALUNO: "aluno@demo.escola.local",
      RESPONSAVEL: "responsavel@demo.escola.local"
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
