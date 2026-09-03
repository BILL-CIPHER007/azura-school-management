"use client";

import { useRef } from "react";
import type { FinancialFilterStatus } from "@/services/financial";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type FilterOption = { value: FinancialFilterStatus | ""; label: string };
type StudentOption = { id: string; label: string };
type GuardianOption = { id: string; label: string };

function formatCurrencyMask(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";

  const cents = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents);
}

function decimalToCurrencyMask(value?: string) {
  if (!value) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numeric);
}

export function FinancialFilters({
  month,
  status,
  studentId,
  guardianId,
  statusOptions,
  students,
  guardians
}: {
  month: string;
  status?: FinancialFilterStatus;
  studentId?: string;
  guardianId?: string;
  statusOptions: FilterOption[];
  students: StudentOption[];
  guardians: GuardianOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function submitFilters() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} className="grid gap-3 lg:grid-cols-[160px_180px_1fr_1fr]">
      <Input type="month" name="mes" defaultValue={month} aria-label="Mes de referencia" onChange={submitFilters} />
      <Select name="status" defaultValue={status ?? ""} aria-label="Status" onChange={submitFilters}>
        {statusOptions.map((item) => (
          <option key={item.value || "all"} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Select name="aluno" defaultValue={studentId ?? ""} aria-label="Aluno" onChange={submitFilters}>
        <option value="">Todos os alunos</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.label}
          </option>
        ))}
      </Select>
      <Select name="responsavel" defaultValue={guardianId ?? ""} aria-label="Responsavel" onChange={submitFilters}>
        <option value="">Todos os responsaveis</option>
        {guardians.map((guardian) => (
          <option key={guardian.id} value={guardian.id}>
            {guardian.label}
          </option>
        ))}
      </Select>
    </form>
  );
}

export function CurrencyInput({
  name,
  defaultValue,
  required = false
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <Input
      name={name}
      defaultValue={decimalToCurrencyMask(defaultValue)}
      placeholder="R$ 0,00"
      inputMode="numeric"
      required={required}
      onChange={(event) => {
        event.currentTarget.value = formatCurrencyMask(event.currentTarget.value);
      }}
      onBlur={(event) => {
        event.currentTarget.value = formatCurrencyMask(event.currentTarget.value);
      }}
    />
  );
}
