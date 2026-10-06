import type { SchoolPlan, StudentCapacity } from "@prisma/client";

export type CommercialFeature = "academicCore" | "studentCsvImport" | "financialModule" | "finance" | "billing";

export type StudentUsageStatus = "NORMAL" | "WARNING" | "LIMIT_REACHED" | "OVER_CAPACITY";

export type PlanConfig = {
  label: string;
  features: Record<CommercialFeature, boolean>;
};

export type CapacityConfig = {
  label: string;
  shortLabel: string;
  maxActiveStudents: number | null;
};

export type StudentCapacityUsage = {
  capacity: StudentCapacity;
  label: string;
  shortLabel: string;
  maxActiveStudents: number | null;
  currentActiveStudents: number;
  incomingStudents: number;
  projectedActiveStudents: number;
  exceededBy: number;
  usagePercent: number | null;
  status: StudentUsageStatus;
  isLimited: boolean;
};

export type CommercialPrice = {
  monthly: number | null;
  implementation: number | null;
  label: string;
};

export const COMMERCIAL_PLAN_CONFIG: Record<SchoolPlan, PlanConfig> = {
  ESSENCIAL: {
    label: "Essencial",
    features: {
      academicCore: true,
      studentCsvImport: true,
      financialModule: false,
      finance: false,
      billing: false
    }
  },
  PROFISSIONAL: {
    label: "Profissional",
    features: {
      academicCore: true,
      studentCsvImport: true,
      financialModule: true,
      finance: true,
      billing: true
    }
  }
};

export const STUDENT_CAPACITY_CONFIG: Record<StudentCapacity, CapacityConfig> = {
  UP_TO_200: {
    label: "Até 200 alunos",
    shortLabel: "Até 200",
    maxActiveStudents: 200
  },
  UP_TO_300: {
    label: "Até 300 alunos",
    shortLabel: "Até 300",
    maxActiveStudents: 300
  },
  UP_TO_500: {
    label: "Até 500 alunos",
    shortLabel: "Até 500",
    maxActiveStudents: 500
  },
  CUSTOM: {
    label: "Capacidade personalizada",
    shortLabel: "Personalizada",
    maxActiveStudents: null
  }
};

export const COMMERCIAL_PRICING: Record<SchoolPlan, Record<StudentCapacity, CommercialPrice>> = {
  ESSENCIAL: {
    UP_TO_200: { monthly: 490, implementation: 1500, label: "R$ 490/mês" },
    UP_TO_300: { monthly: 590, implementation: 1800, label: "R$ 590/mês" },
    UP_TO_500: { monthly: 690, implementation: 2200, label: "R$ 690/mês" },
    CUSTOM: { monthly: null, implementation: null, label: "Proposta personalizada" }
  },
  PROFISSIONAL: {
    UP_TO_200: { monthly: 790, implementation: 2500, label: "R$ 790/mês" },
    UP_TO_300: { monthly: 890, implementation: 2900, label: "R$ 890/mês" },
    UP_TO_500: { monthly: 990, implementation: 3500, label: "R$ 990/mês" },
    CUSTOM: { monthly: null, implementation: null, label: "Proposta personalizada" }
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

export function getStudentCapacityConfig(capacity: StudentCapacity) {
  return STUDENT_CAPACITY_CONFIG[capacity];
}

export function getStudentCapacityLimit(capacity: StudentCapacity) {
  return getStudentCapacityConfig(capacity).maxActiveStudents;
}

export function getStudentCapacityLabel(capacity: StudentCapacity) {
  return getStudentCapacityConfig(capacity).label;
}

export function getCommercialPrice(plan: SchoolPlan, capacity: StudentCapacity) {
  return COMMERCIAL_PRICING[plan][capacity];
}

export function getStudentUsage(
  currentActiveStudents: number,
  capacity: StudentCapacity,
  incomingStudents = 0
): StudentCapacityUsage {
  const config = getStudentCapacityConfig(capacity);
  const projectedActiveStudents = currentActiveStudents + incomingStudents;
  const maxActiveStudents = config.maxActiveStudents;

  if (maxActiveStudents === null) {
    return {
      capacity,
      label: config.label,
      shortLabel: config.shortLabel,
      maxActiveStudents,
      currentActiveStudents,
      incomingStudents,
      projectedActiveStudents,
      exceededBy: 0,
      usagePercent: null,
      status: "NORMAL",
      isLimited: false
    };
  }

  const exactUsagePercent = (projectedActiveStudents / maxActiveStudents) * 100;
  const usagePercent = Math.round(exactUsagePercent);
  const exceededBy = Math.max(0, projectedActiveStudents - maxActiveStudents);
  const status: StudentUsageStatus =
    projectedActiveStudents > maxActiveStudents
      ? "OVER_CAPACITY"
      : projectedActiveStudents === maxActiveStudents
        ? "LIMIT_REACHED"
        : exactUsagePercent >= 90
          ? "WARNING"
          : "NORMAL";

  return {
    capacity,
    label: config.label,
    shortLabel: config.shortLabel,
    maxActiveStudents,
    currentActiveStudents,
    incomingStudents,
    projectedActiveStudents,
    exceededBy,
    usagePercent,
    status,
    isLimited: true
  };
}

export function getStudentUsageMessage(usage: StudentCapacityUsage) {
  if (!usage.isLimited) {
    return "Capacidade personalizada sem limite automático definido.";
  }

  const total = `${usage.projectedActiveStudents} de ${usage.maxActiveStudents} alunos ativos`;

  if (usage.status === "OVER_CAPACITY") {
    return `A capacidade contratada foi excedida: ${total}. A operação acadêmica continua disponível, mas é necessário revisar a faixa contratada.`;
  }
  if (usage.status === "LIMIT_REACHED") {
    return `A capacidade contratada foi atingida: ${total}. Entre em contato para revisar a faixa da escola.`;
  }
  if (usage.status === "WARNING") {
    return `Sua escola está próxima da capacidade contratada: ${total}.`;
  }

  return `Uso dentro da capacidade contratada: ${total}.`;
}
