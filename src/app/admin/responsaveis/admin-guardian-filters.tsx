"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function AdminGuardianFilters({
  relations,
  selectedSearch,
  selectedRelation
}: {
  relations: string[];
  selectedSearch?: string;
  selectedRelation?: string;
}) {
  const router = useRouter();

  function updateFilters(next: { busca?: string; parentesco?: string }) {
    const params = new URLSearchParams();
    const search = next.busca ?? selectedSearch;
    const relation = next.parentesco ?? selectedRelation;

    if (search?.trim()) params.set("busca", search.trim());
    if (relation) params.set("parentesco", relation);

    const query = params.toString();
    router.replace(query ? `/admin/responsaveis?${query}` : "/admin/responsaveis", { scroll: false });
  }

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_220px]"
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
        name="parentesco"
        defaultValue={selectedRelation ?? ""}
        aria-label="Filtrar por parentesco"
        onChange={(event) => updateFilters({ parentesco: event.target.value })}
      >
        <option value="">Todos os parentescos</option>
        {relations.map((relation) => (
          <option key={relation} value={relation}>
            {relation}
          </option>
        ))}
      </Select>
    </form>
  );
}
