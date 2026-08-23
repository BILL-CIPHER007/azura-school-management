"use client";

import { UsersRound } from "lucide-react";
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
  const context = classroom
    ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}${enrollment?.academicYear ? ` · ${enrollment.academicYear.year}` : ""}`
    : "Sem matrícula ativa";

  function changeStudent(studentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", studentId);
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!students.length) {
    return (
      <div className="rounded-lg border border-warning/25 bg-warning-soft/60 p-4 shadow-sm">
        <p className="text-sm font-semibold text-school-navy">Nenhum aluno vinculado</p>
        <p className="mt-1 text-sm text-text-secondary">Entre em contato com a escola para revisar seu vínculo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-school-primary-soft text-school-primary">
          <UsersRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-text-muted">Acompanhando</p>
          {students.length === 1 ? (
            <p className="mt-1 truncate text-base font-semibold text-school-navy">{selected.fullName}</p>
          ) : (
            <div className="relative mt-1">
              <Select
                aria-label="Selecionar aluno acompanhado"
                value={selected?.id}
                onChange={(event) => changeStudent(event.target.value)}
                className="h-9 font-semibold text-school-navy"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <p className="mt-2 text-sm text-text-secondary">{context}</p>
        </div>
      </div>
    </div>
  );
}
