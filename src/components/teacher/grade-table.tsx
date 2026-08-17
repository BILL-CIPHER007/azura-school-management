"use client";

import { useMemo, useState } from "react";
import { saveGrades } from "@/app/actions/academic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  rows
}: {
  classroomId: string;
  subjectId: string;
  periodId: string;
  rows: GradeRow[];
}) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.enrollmentId,
          { av1: row.av1, av2: row.av2, assignment: row.assignment }
        ])
      ) as GradeValues,
    [rows]
  );
  const [values, setValues] = useState<GradeValues>(initialValues);
  const [dirty, setDirty] = useState(false);

  function updateValue(enrollmentId: string, field: keyof GradeValues[string], value: string) {
    const numberValue = Number(value);
    setDirty(true);
    setValues((current) => ({
      ...current,
      [enrollmentId]: {
        ...current[enrollmentId],
        [field]: Number.isFinite(numberValue) ? numberValue : 0
      }
    }));
  }

  return (
    <form action={saveGrades} className="grid gap-4">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="periodId" value={periodId} />

      <div className="flex min-h-8 items-center justify-between gap-3">
        <div>
          {dirty ? <Badge variant="warning">Alterações não salvas</Badge> : null}
        </div>
        <Button type="submit">Salvar alterações</Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">AV1</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">AV2</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trabalho</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Média</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowValues = values[row.enrollmentId] ?? {
                  av1: 0,
                  av2: 0,
                  assignment: 0
                };
                const average = (rowValues.av1 + rowValues.av2 + rowValues.assignment) / 3;

                return (
                  <tr key={row.enrollmentId} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      <input type="hidden" name="enrollmentId" value={row.enrollmentId} />
                      {row.studentName}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name={`av1-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={rowValues.av1}
                        onChange={(event) => updateValue(row.enrollmentId, "av1", event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name={`av2-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={rowValues.av2}
                        onChange={(event) => updateValue(row.enrollmentId, "av2", event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name={`assignment-${row.enrollmentId}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={rowValues.assignment}
                        onChange={(event) =>
                          updateValue(row.enrollmentId, "assignment", event.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-base font-semibold">{average.toFixed(1)}</td>
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
