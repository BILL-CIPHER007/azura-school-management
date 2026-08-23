"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { shiftLabel } from "@/lib/admin-labels";

type AcademicYearOption = {
  id: string;
  year: number;
  periods: Array<{ id: string; name: string }>;
};

type ClassroomOption = {
  id: string;
  name: string;
  shift: string;
  academicYearId: string;
  academicYear: { year: number };
};

export function AdminReportFilters({
  academicYears,
  classrooms,
  selectedAcademicYear,
  selectedClassroom,
  selectedPeriod
}: {
  academicYears: AcademicYearOption[];
  classrooms: ClassroomOption[];
  selectedAcademicYear?: string;
  selectedClassroom?: string;
  selectedPeriod?: string;
}) {
  const router = useRouter();
  const currentYear = academicYears.find((year) => year.id === selectedAcademicYear) ?? academicYears[0] ?? null;
  const visibleClassrooms = selectedAcademicYear
    ? classrooms.filter((classroom) => classroom.academicYearId === selectedAcademicYear)
    : classrooms;
  const visiblePeriods = currentYear?.periods ?? [];

  function updateFilters(next: { ano?: string; turma?: string; periodo?: string }) {
    const params = new URLSearchParams();
    const academicYear = next.ano ?? selectedAcademicYear ?? "";
    const classroom = next.turma ?? selectedClassroom ?? "";
    const period = next.periodo ?? selectedPeriod ?? "";

    if (academicYear) params.set("ano", academicYear);
    if (classroom) params.set("turma", classroom);
    if (period) params.set("periodo", period);

    const query = params.toString();
    router.replace(query ? `/admin/relatorios?${query}` : "/admin/relatorios", { scroll: false });
  }

  function handleAcademicYearChange(value: string) {
    updateFilters({ ano: value, turma: "", periodo: "" });
  }

  return (
    <div className="grid gap-3 md:grid-cols-[180px_260px_220px]">
      <Select
        name="ano"
        value={selectedAcademicYear ?? ""}
        aria-label="Filtrar por ano letivo"
        onChange={(event) => handleAcademicYearChange(event.target.value)}
      >
        {academicYears.map((year) => (
          <option key={year.id} value={year.id}>
            {year.year}
          </option>
        ))}
      </Select>

      <Select
        name="turma"
        value={selectedClassroom ?? ""}
        aria-label="Filtrar por turma"
        onChange={(event) => updateFilters({ turma: event.target.value })}
      >
        <option value="">Todas as turmas</option>
        {visibleClassrooms.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name} · {shiftLabel(classroom.shift)}
          </option>
        ))}
      </Select>

      <Select
        name="periodo"
        value={selectedPeriod ?? ""}
        aria-label="Filtrar por período"
        onChange={(event) => updateFilters({ periodo: event.target.value })}
      >
        <option value="">Todos os períodos</option>
        {visiblePeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
