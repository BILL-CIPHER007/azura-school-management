"use client";

import { useState } from "react";
import type { AnnouncementAudience, Classroom, AcademicYear } from "@prisma/client";
import { createAnnouncement } from "@/app/actions/academic";
import {
  announcementAudienceLabel,
  announcementCanUseClassroom,
  announcementRequiresClassroom
} from "@/lib/announcements";
import { shiftLabel } from "@/lib/admin-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ClassroomOption = Pick<Classroom, "id" | "name" | "shift"> & {
  academicYear: Pick<AcademicYear, "year">;
};

const audienceOptions: AnnouncementAudience[] = ["SCHOOL", "PROFESSORS", "STUDENTS", "GUARDIANS", "CLASSROOM"];

export function AnnouncementForm({ classrooms }: { classrooms: ClassroomOption[] }) {
  const [audience, setAudience] = useState<AnnouncementAudience>("SCHOOL");
  const [classroomId, setClassroomId] = useState("");
  const showClassroomField = announcementCanUseClassroom(audience);
  const classroomRequired = announcementRequiresClassroom(audience);

  function handleAudienceChange(value: AnnouncementAudience) {
    setAudience(value);
    setClassroomId("");
  }

  return (
    <form action={createAnnouncement} className="grid gap-3">
      <div className={`grid gap-3 ${showClassroomField ? "md:grid-cols-[1fr_220px_260px]" : "md:grid-cols-[1fr_220px]"}`}>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-text-muted">Título</span>
          <Input name="title" placeholder="Título do comunicado" required />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-text-muted">Público</span>
          <Select
            name="audience"
            value={audience}
            onChange={(event) => handleAudienceChange(event.target.value as AnnouncementAudience)}
          >
            {audienceOptions.map((option) => (
              <option key={option} value={option}>
                {announcementAudienceLabel(option)}
              </option>
            ))}
          </Select>
        </label>

        {showClassroomField ? (
          <label className="grid gap-1">
            <span className="text-xs font-medium text-text-muted">Turma</span>
            <Select
              name="classroomId"
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
              required={classroomRequired}
            >
              <option value="">{classroomRequired ? "Selecione uma turma" : "Todas as turmas"}</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} · {shiftLabel(classroom.shift)} · {classroom.academicYear.year}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-medium text-text-muted">Conteúdo</span>
        <Textarea name="content" placeholder="Conteúdo do comunicado" required />
      </label>

      <Button type="submit" className="w-fit">
        Publicar comunicado
      </Button>
    </form>
  );
}
