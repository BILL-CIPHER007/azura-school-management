"use client";

import { useMemo, useState } from "react";
import { saveAttendance } from "@/app/actions/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceLabel } from "@/lib/teacher-labels";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type StudentRow = {
  enrollmentId: string;
  name: string;
  currentStatus?: AttendanceStatus;
};

export function AttendanceList({
  classroomId,
  subjectId,
  subjectName,
  students,
  defaultDate
}: {
  classroomId: string;
  subjectId: string;
  subjectName: string;
  students: StudentRow[];
  defaultDate: string;
}) {
  const initialStatuses = useMemo(
    () =>
      Object.fromEntries(
        students.map((student) => [student.enrollmentId, student.currentStatus ?? "PRESENT"])
      ) as Record<string, AttendanceStatus>,
    [students]
  );
  const [statuses, setStatuses] = useState(initialStatuses);

  const summary = Object.values(statuses).reduce(
    (acc, status) => {
      acc[status] += 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, JUSTIFIED: 0 } as Record<AttendanceStatus, number>
  );

  return (
    <form action={saveAttendance} className="grid gap-4">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="subjectId" value={subjectId} />

      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[220px_1fr_auto] lg:items-center">
        <Input name="date" type="date" defaultValue={defaultDate} />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">{subjectName}</strong> · {students.length} alunos
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setStatuses(
              Object.fromEntries(students.map((student) => [student.enrollmentId, "PRESENT"]))
            )
          }
        >
          Marcar todos como presentes
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-md bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
          Presentes: {summary.PRESENT}
        </span>
        <span className="rounded-md bg-red-50 px-3 py-1 font-medium text-red-700">
          Ausentes: {summary.ABSENT}
        </span>
        <span className="rounded-md bg-amber-50 px-3 py-1 font-medium text-amber-700">
          Justificados: {summary.JUSTIFIED}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        {students.map((student) => (
          <div
            key={student.enrollmentId}
            className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div className="font-medium">
              <input type="hidden" name="enrollmentId" value={student.enrollmentId} />
              {student.name}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["PRESENT", "ABSENT", "JUSTIFIED"] as const).map((status) => (
                <label
                  key={status}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    statuses[student.enrollmentId] === status
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name={`status-${student.enrollmentId}`}
                    value={status}
                    checked={statuses[student.enrollmentId] === status}
                    onChange={() =>
                      setStatuses((current) => ({
                        ...current,
                        [student.enrollmentId]: status
                      }))
                    }
                  />
                  {attendanceLabel(status)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-fit">Salvar chamada</Button>
    </form>
  );
}
