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
  schoolName: string;
  schoolSlug: string;
  emailDomain: string;
  passwordFallback: string;
  users: Record<UserRole, string>;
  metrics: Array<{ value: string; label: string }>;
};

export type SchoolConfig = {
  name: string;
  shortName: string;
  initials: string;
  slug: string;
  descriptor: string;
  fullName: string;
  description: string;
  landingTitle: string;
  landingSubtitle: string;
  metadata: {
    title: string;
    description: string;
  };
  branding: SchoolBranding;
  theme: SchoolTheme;
  academic: AcademicConfig;
  features: FeatureConfig;
  demo: DemoConfig;
};

const productName = process.env.NEXT_PUBLIC_PRODUCT_NAME || "Azura";
const productDescriptor = process.env.NEXT_PUBLIC_PRODUCT_DESCRIPTOR || "Sistema de Gestão Escolar";
const productShortName = process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME || "Azura";
const productInitials = process.env.NEXT_PUBLIC_PRODUCT_INITIALS || "AZ";

export const schoolConfig: SchoolConfig = {
  name: productName,
  shortName: productShortName,
  initials: productInitials,
  slug: "azura",
  descriptor: productDescriptor,
  fullName: `${productName} — ${productDescriptor}`,
  description: "Plataforma integrada para gestão acadêmica, comunicação e acompanhamento escolar.",
  landingTitle: `${productName} — ${productDescriptor}`,
  landingSubtitle: "Gestão escolar, acompanhamento acadêmico e comunicação em um só lugar.",
  metadata: {
    title: `${productName} | ${productDescriptor}`,
    description: "Plataforma integrada para gestão acadêmica, comunicação e acompanhamento escolar."
  },
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
    schoolName: "Escola Demonstrativa",
    schoolSlug: "escola-demonstrativa",
    emailDomain: "demo.azura.local",
    passwordFallback: "demo123",
    users: {
      ADMIN: "admin@demo.azura.local",
      PROFESSOR: "professor@demo.azura.local",
      ALUNO: "aluno@demo.azura.local",
      RESPONSAVEL: "responsavel@demo.azura.local"
    },
    metrics: [
      { value: "4", label: "perfis integrados" },
      { value: "1", label: "gestao centralizada" },
      { value: "", label: "rotina conectada" }
    ]
  }
};

export function getDemoPassword() {
  return process.env.DEMO_PASSWORD ?? schoolConfig.demo.passwordFallback;
}
