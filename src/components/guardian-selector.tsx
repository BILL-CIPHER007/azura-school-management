import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function GuardianStudentSelector({
  students,
  selectedStudentId
}: {
  students: Array<{ id: string; fullName: string }>;
  selectedStudentId?: string;
}) {
  return (
    <form className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <label className="text-sm font-medium">Aluno selecionado:</label>
      <Select name="studentId" defaultValue={selectedStudentId ?? students[0]?.id} className="sm:w-72">
        {students.map((child) => (
          <option key={child.id} value={child.id}>
            {child.fullName}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">Aplicar</Button>
    </form>
  );
}
