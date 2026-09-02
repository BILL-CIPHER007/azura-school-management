import type { SchoolPlan } from "@prisma/client";

export type CommercialFeature = "academicCore" | "studentCsvImport" | "financialModule";

export type PlanConfig = {
  label: string;
  maxActiveStudents: number;
  features: Record<CommercialFeature, boolean>;
};

export type StudentLimitCheck = {
  allowed: boolean;
  currentActiveStudents: number;
  incomingStudents: number;
  maxActiveStudents: number;
  exceededBy: number;
};

export const COMMERCIAL_PLAN_CONFIG: Record<SchoolPlan, PlanConfig> = {
  ESSENCIAL: {
    label: "Essencial",
    maxActiveStudents: 200,
    features: {
      academicCore: true,
      studentCsvImport: true,
      financialModule: false
    }
  },
  PROFISSIONAL: {
    label: "Profissional",
    maxActiveStudents: 500,
    features: {
      academicCore: true,
      studentCsvImport: true,
      financialModule: true
    }
  }
};

export function getPlanConfig(plan: SchoolPlan) {
  return COMMERCIAL_PLAN_CONFIG[plan];
}

export function formatSchoolPlan(plan: SchoolPlan) {
  return getPlanConfig(plan).label;
}

export function hasCommercialFeature(plan: SchoolPlan, feature: CommercialFeature) {
  return getPlanConfig(plan).features[feature];
}

export function checkActiveStudentLimit(
  plan: SchoolPlan,
  currentActiveStudents: number,
  incomingStudents = 1
): StudentLimitCheck {
  const maxActiveStudents = getPlanConfig(plan).maxActiveStudents;
  const exceededBy = Math.max(0, currentActiveStudents + incomingStudents - maxActiveStudents);

  return {
    allowed: exceededBy === 0,
    currentActiveStudents,
    incomingStudents,
    maxActiveStudents,
    exceededBy
  };
}
