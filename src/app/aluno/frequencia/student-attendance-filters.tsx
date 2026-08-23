"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type SubjectOption = {
  id: string;
  name: string;
};

export function StudentAttendanceFilters({
  subjects,
  selectedSubject,
  selectedPeriod,
  selectedStatus
}: {
  subjects: SubjectOption[];
  selectedSubject: string;
  selectedPeriod: string;
  selectedStatus: string;
}) {
  const router = useRouter();

  function updateFilters(next: { disciplina?: string; periodo?: string; status?: string }) {
    const subject = next.disciplina ?? selectedSubject;
    const period = next.periodo ?? selectedPeriod;
    const status = next.status ?? selectedStatus;
    const params = new URLSearchParams();

    if (subject && subject !== "todas") params.set("disciplina", subject);
    if (period && period !== "todos") params.set("periodo", period);
    if (status && status !== "todos") params.set("status", status);

    const query = params.toString();
    router.replace(query ? `/aluno/frequencia?${query}` : "/aluno/frequencia", { scroll: false });
  }

  return (
    <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
      <Select
        name="disciplina"
        value={selectedSubject}
        aria-label="Disciplina"
        onChange={(event) => updateFilters({ disciplina: event.target.value })}
      >
        <option value="todas">Todas as disciplinas</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </Select>
      <Select
        name="periodo"
        value={selectedPeriod}
        aria-label="Período"
        onChange={(event) => updateFilters({ periodo: event.target.value })}
      >
        <option value="todos">Todo o período</option>
        <option value="30">Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
      </Select>
      <Select
        name="status"
        value={selectedStatus}
        aria-label="Status"
        onChange={(event) => updateFilters({ status: event.target.value })}
      >
        <option value="todos">Todos os status</option>
        <option value="presente">Presente</option>
        <option value="ausente">Ausente</option>
        <option value="justificado">Justificado</option>
      </Select>
    </div>
  );
}
