"use client";

import type { EnrollmentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ClassroomOption = {
  id: string;
  name: string;
};

export function AdminEnrollmentFilters({
  classrooms,
  selectedSearch,
  selectedClassroom,
  selectedStatus
}: {
  classrooms: ClassroomOption[];
  selectedSearch?: string;
  selectedClassroom?: string;
  selectedStatus?: EnrollmentStatus;
}) {
  const router = useRouter();

  function updateFilters(next: { busca?: string; turma?: string; situacao?: string }) {
    const params = new URLSearchParams();
    const search = next.busca ?? selectedSearch;
    const classroom = next.turma ?? selectedClassroom;
    const status = next.situacao ?? selectedStatus;

    if (search?.trim()) params.set("busca", search.trim());
    if (classroom) params.set("turma", classroom);
    if (status) params.set("situacao", status);

    const query = params.toString();
    router.replace(query ? `/admin/matriculas?${query}` : "/admin/matriculas", { scroll: false });
  }

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_220px_190px]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        updateFilters({ busca: String(form.get("busca") ?? "") });
      }}
    >
      <label className="relative">
        <span className="sr-only">Buscar por aluno ou matrícula</span>
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
        <Input
          name="busca"
          placeholder="Buscar por aluno ou matrícula e pressionar Enter"
          defaultValue={selectedSearch}
          className="pl-9"
        />
      </label>
      <Select
        name="turma"
        defaultValue={selectedClassroom ?? ""}
        aria-label="Filtrar por turma"
        onChange={(event) => updateFilters({ turma: event.target.value })}
      >
        <option value="">Todas as turmas</option>
        {classrooms.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name}
          </option>
        ))}
      </Select>
      <Select
        name="situacao"
        defaultValue={selectedStatus ?? ""}
        aria-label="Filtrar por status da matrícula"
        onChange={(event) => updateFilters({ situacao: event.target.value })}
      >
        <option value="">Todos os status</option>
        <option value="ACTIVE">Ativa</option>
        <option value="TRANSFERRED">Transferida</option>
        <option value="COMPLETED">Concluída</option>
        <option value="CANCELLED">Cancelada</option>
      </Select>
    </form>
  );
}
