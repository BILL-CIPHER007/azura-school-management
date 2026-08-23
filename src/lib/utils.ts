import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAcademicStatus, type AcademicStatusContext } from "@/lib/academic-rules";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function gradeSituation(averageScore: number, attendanceRate: number, context?: AcademicStatusContext) {
  return getAcademicStatus(averageScore, attendanceRate, context);
}
