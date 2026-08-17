"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { guardianShiftLabel } from "@/lib/guardian-labels";

type SwitcherStudent = {
  id: string;
  fullName: string;
  enrollments: Array<{
    classroom: { name: string; shift: string } | null;
    academicYear?: { year: number } | null;
  }>;
};

export function StudentSwitcher({
  students,
  selectedStudentId
}: {
  students: SwitcherStudent[];
  selectedStudentId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const enrollment = selected?.enrollments[0];
  const classroom = enrollment?.classroom;

  function changeStudent(studentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", studentId);
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!students.length) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-950">Nenhum aluno vinculado</p>
        <p className="mt-1 text-sm text-muted-foreground">Entre em contato com a escola para revisar seu vínculo.</p>
      </div>
    );
  }

  if (students.length === 1) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-medium uppercase text-muted-foreground">Acompanhando</p>
        <p className="mt-1 font-semibold text-slate-950">{selected.fullName}</p>
        {classroom ? (
          <p className="text-sm text-muted-foreground">
            {classroom.name} · {guardianShiftLabel(classroom.shift)}{enrollment?.academicYear ? ` · ${enrollment.academicYear.year}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <label htmlFor="guardian-student-switcher" className="text-xs font-medium uppercase text-muted-foreground">
        Acompanhando
      </label>
      <Select
        id="guardian-student-switcher"
        value={selected?.id}
        onChange={(event) => changeStudent(event.target.value)}
        className="mt-2"
      >
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.fullName}
          </option>
        ))}
      </Select>
      {classroom ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {classroom.name} · {guardianShiftLabel(classroom.shift)}{enrollment?.academicYear ? ` · ${enrollment.academicYear.year}` : ""}
        </p>
      ) : null}
    </div>
  );
}
