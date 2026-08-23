"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { GradeTable } from "@/components/teacher/grade-table";

type TeacherAssignment = {
  subjectId: string;
  subject: { id: string; name: string };
};

type AcademicPeriod = {
  id: string;
  name: string;
};

type GradeRow = {
  enrollmentId: string;
  studentName: string;
  av1: number;
  av2: number;
  assignment: number;
};

export function GradeWorkspace({
  classroomId,
  assignments,
  periods,
  activeSubjectId,
  periodId,
  rows,
  minimumGrade,
  saved
}: {
  classroomId: string;
  assignments: TeacherAssignment[];
  periods: AcademicPeriod[];
  activeSubjectId: string;
  periodId: string;
  rows: GradeRow[];
  minimumGrade: number;
  saved: boolean;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const activeSubject = assignments.find((assignment) => assignment.subjectId === activeSubjectId) ?? assignments[0];

  const confirmNavigation = useCallback(() => {
    if (!dirty) return true;
    return window.confirm("Você tem alterações não salvas. Deseja sair sem salvar?");
  }, [dirty]);

  const navigateToFilters = useCallback(
    (nextSubjectId: string, nextPeriodId: string) => {
      if (!confirmNavigation()) return;

      const params = new URLSearchParams();
      params.set("tab", "notas");
      params.set("subjectId", nextSubjectId);
      params.set("periodId", nextPeriodId);
      router.push(`/professor/turmas/${classroomId}?${params.toString()}`);
    },
    [classroomId, confirmNavigation, router]
  );

  useEffect(() => {
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href);
      if (destination.href === window.location.href) return;
      if (confirmNavigation()) return;

      event.preventDefault();
      event.stopPropagation();
    }

    function handleDocumentSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.gradeSaveForm === "true") return;
      if (confirmNavigation()) return;

      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("submit", handleDocumentSubmit, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("submit", handleDocumentSubmit, true);
    };
  }, [confirmNavigation, dirty]);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-school-navy">Notas</h2>
        <p className="text-sm text-text-secondary">
          Edite as avaliações diretamente na tabela. Os períodos vêm do banco de dados.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-2">
        {assignments.length > 1 ? (
          <label className="grid gap-1 text-sm font-medium text-school-navy">
            Disciplina
            <Select
              value={activeSubjectId}
              onChange={(event) => navigateToFilters(event.target.value, periodId)}
              aria-label="Disciplina"
            >
              {assignments.map((assignment) => (
                <option key={assignment.subjectId} value={assignment.subjectId}>
                  {assignment.subject.name}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <div className="grid gap-1 text-sm font-medium text-school-navy">
            Disciplina
            <div className="flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm font-normal text-text-primary">
              {activeSubject.subject.name}
            </div>
          </div>
        )}

        <label className="grid gap-1 text-sm font-medium text-school-navy">
          Bimestre
          <Select
            value={periodId}
            onChange={(event) => navigateToFilters(activeSubjectId, event.target.value)}
            aria-label="Bimestre"
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <GradeTable
        key={`${activeSubjectId}-${periodId}`}
        classroomId={classroomId}
        subjectId={activeSubjectId}
        periodId={periodId}
        rows={rows}
        minimumGrade={minimumGrade}
        saved={saved}
        onDirtyChange={setDirty}
      />
    </div>
  );
}
