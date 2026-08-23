"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type PeriodOption = {
  id: string;
  name: string;
};

export function GuardianReportFilters({
  studentId,
  years,
  periods,
  selectedYear,
  selectedPeriod
}: {
  studentId?: string;
  years: string[];
  periods: PeriodOption[];
  selectedYear: string;
  selectedPeriod: string;
}) {
  const router = useRouter();

  function updateFilters(next: { ano?: string; periodo?: string }) {
    const params = new URLSearchParams();
    const year = next.ano ?? selectedYear;
    const period = next.periodo ?? selectedPeriod;

    if (studentId) params.set("studentId", studentId);
    if (year) params.set("ano", year);
    if (period && period !== "todos") params.set("periodo", period);

    const query = params.toString();
    router.replace(query ? `/responsavel/boletim?${query}` : "/responsavel/boletim", { scroll: false });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[180px_220px]">
      <Select
        name="ano"
        value={selectedYear}
        aria-label="Ano letivo"
        onChange={(event) => updateFilters({ ano: event.target.value, periodo: "todos" })}
      >
        {years.length ? (
          years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))
        ) : (
          <option value="">Sem anos</option>
        )}
      </Select>
      <Select
        name="periodo"
        value={selectedPeriod}
        aria-label="Período"
        onChange={(event) => updateFilters({ periodo: event.target.value })}
      >
        <option value="todos">Todos os bimestres</option>
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
