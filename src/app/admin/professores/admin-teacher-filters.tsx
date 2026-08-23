"use client";

import type { UserStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type SubjectOption = {
  id: string;
  name: string;
};

export function AdminTeacherFilters({
  subjects,
  selectedSearch,
  selectedSubject,
  selectedStatus
}: {
  subjects: SubjectOption[];
  selectedSearch?: string;
  selectedSubject?: string;
  selectedStatus?: UserStatus;
}) {
  const router = useRouter();

  function updateFilters(next: { busca?: string; disciplina?: string; status?: string }) {
    const params = new URLSearchParams();
    const search = next.busca ?? selectedSearch;
    const subject = next.disciplina ?? selectedSubject;
    const status = next.status ?? selectedStatus;

    if (search?.trim()) params.set("busca", search.trim());
    if (subject) params.set("disciplina", subject);
    if (status) params.set("status", status);

    const query = params.toString();
    router.replace(query ? `/admin/professores?${query}` : "/admin/professores", { scroll: false });
  }

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_220px_160px]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        updateFilters({ busca: String(form.get("busca") ?? "") });
      }}
    >
      <label className="relative">
        <span className="sr-only">Buscar por nome</span>
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
        <Input
          name="busca"
          placeholder="Buscar por nome e pressionar Enter"
          defaultValue={selectedSearch}
          className="pl-9"
        />
      </label>
      <Select
        name="disciplina"
        defaultValue={selectedSubject ?? ""}
        aria-label="Filtrar por disciplina"
        onChange={(event) => updateFilters({ disciplina: event.target.value })}
      >
        <option value="">Todas as disciplinas</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </Select>
      <Select
        name="status"
        defaultValue={selectedStatus ?? ""}
        aria-label="Filtrar por status"
        onChange={(event) => updateFilters({ status: event.target.value })}
      >
        <option value="">Todos os status</option>
        <option value="ACTIVE">Ativo</option>
        <option value="INACTIVE">Inativo</option>
      </Select>
    </form>
  );
}
