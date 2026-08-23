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
  classroomName,
  students,
  defaultDate
}: {
  classroomId: string;
  subjectId: string;
  subjectName: string;
  classroomName: string;
  students: StudentRow[];
  defaultDate: string;
}) {
  const initialStatuses = useMemo(
    () =>
      Object.fromEntries(students.map((student) => [student.enrollmentId, student.currentStatus ?? "PRESENT"])) as Record<
        string,
        AttendanceStatus
      >,
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

      <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-[220px_1fr_auto] lg:items-center">
        <Input name="date" type="date" defaultValue={defaultDate} />
        <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-3">
          <span>
            <strong className="block text-school-navy">Turma</strong>
            {classroomName}
          </span>
          <span>
            <strong className="block text-school-navy">Disciplina</strong>
            {subjectName}
          </span>
          <span>
            <strong className="block text-school-navy">Alunos</strong>
            {students.length}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setStatuses(Object.fromEntries(students.map((student) => [student.enrollmentId, "PRESENT"])))
          }
        >
          Marcar todos como presentes
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-md bg-success-soft px-3 py-1 font-medium text-success">
          Presentes: {summary.PRESENT}
        </span>
        <span className="rounded-md bg-danger-soft px-3 py-1 font-medium text-danger">
          Ausentes: {summary.ABSENT}
        </span>
        <span className="rounded-md bg-warning-soft px-3 py-1 font-medium text-warning">
          Justificados: {summary.JUSTIFIED}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {students.map((student) => (
          <div
            key={student.enrollmentId}
            className="grid gap-3 border-b border-border p-3 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div className="font-medium text-school-navy">
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
                      ? "border-school-primary bg-school-primary text-white"
                      : "border-border bg-surface text-text-secondary hover:bg-school-primary-soft hover:text-school-primary"
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

      <Button type="submit" className="w-fit">
        Salvar chamada
      </Button>
    </form>
  );
}
