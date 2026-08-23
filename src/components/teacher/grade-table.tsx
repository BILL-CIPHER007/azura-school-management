"use client";

import { useEffect, useMemo, useState } from "react";
import { saveGrades } from "@/app/actions/academic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type GradeRow = {
  enrollmentId: string;
  studentName: string;
  av1: number;
  av2: number;
  assignment: number;
};

type GradeValues = Record<string, { av1: number; av2: number; assignment: number }>;

export function GradeTable({
  classroomId,
  subjectId,
  periodId,
  rows,
  minimumGrade,
  saved,
  onDirtyChange
}: {
  classroomId: string;
  subjectId: string;
  periodId: string;
  rows: GradeRow[];
  minimumGrade: number;
  saved: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [row.enrollmentId, { av1: row.av1, av2: row.av2, assignment: row.assignment }])
      ) as GradeValues,
    [rows]
  );
  const [values, setValues] = useState<GradeValues>(initialValues);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const computedRows = rows.map((row) => {
    const rowValues = values[row.enrollmentId] ?? { av1: 0, av2: 0, assignment: 0 };
    const average = (rowValues.av1 + rowValues.av2 + rowValues.assignment) / 3;
    return { ...row, values: rowValues, average };
  });

  const averages = computedRows.map((row) => row.average);
  const classAverage = averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : 0;
  const highestAverage = averages.length ? Math.max(...averages) : 0;
  const belowMinimum = computedRows.filter((row) => row.average < minimumGrade).length;

  function updateValue(enrollmentId: string, field: keyof GradeValues[string], value: string) {
    const numberValue = Number(value);
    setDirty(true);
    onDirtyChange?.(true);
    setValues((current) => ({
      ...current,
      [enrollmentId]: {
        ...current[enrollmentId],
        [field]: Number.isFinite(numberValue) ? numberValue : 0
      }
    }));
  }

  return (
    <form
      action={saveGrades}
      className="grid gap-4"
      data-grade-save-form="true"
      onSubmit={() => {
        setDirty(false);
        onDirtyChange?.(false);
      }}
    >
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="periodId" value={periodId} />

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <div>
          {dirty ? <Badge variant="warning">Alterações não salvas</Badge> : null}
          {!dirty && saved ? <Badge variant="success">Tudo salvo</Badge> : null}
        </div>
        <Button type="submit">Salvar alterações</Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-normal text-text-muted">Média da turma</p>
          <strong className="mt-1 block text-2xl font-semibold text-school-navy">{classAverage.toFixed(1)}</strong>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-normal text-text-muted">Maior média</p>
          <strong className="mt-1 block text-2xl font-semibold text-school-navy">{highestAverage.toFixed(1)}</strong>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-normal text-text-muted">Alunos abaixo da média</p>
          <strong className="mt-1 block text-2xl font-semibold text-warning">{belowMinimum}</strong>
          <p className="mt-1 text-xs text-text-muted">Mínima {minimumGrade.toFixed(1)}</p>
        </div>
      </section>

      <div className="teacher-table-wrap">
        <div className="max-h-[62vh] overflow-auto">
          <table className="teacher-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Aluno</th>
                <th>AV1</th>
                <th>AV2</th>
                <th>Trabalho</th>
                <th>Média</th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row) => {
                const belowGrade = row.average < minimumGrade;
                return (
                  <tr key={row.enrollmentId}>
                    <td className="font-medium">
                      <input type="hidden" name="enrollmentId" value={row.enrollmentId} />
                      {row.studentName}
                    </td>
                    <td>
                      <Input
                        className="w-24"
                        name={`av1-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={row.values.av1}
                        onChange={(event) => updateValue(row.enrollmentId, "av1", event.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        className="w-24"
                        name={`av2-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={row.values.av2}
                        onChange={(event) => updateValue(row.enrollmentId, "av2", event.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        className="w-24"
                        name={`assignment-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={row.values.assignment}
                        onChange={(event) => updateValue(row.enrollmentId, "assignment", event.target.value)}
                      />
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 text-base font-semibold",
                          belowGrade ? "bg-warning-soft text-warning ring-1 ring-warning/15" : "text-school-navy"
                        )}
                      >
                        {row.average.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
