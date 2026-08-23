"use client";

import * as React from "react";
import { createEnrollment } from "@/app/actions/academic";
import { AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { shiftLabel } from "@/lib/admin-labels";
import { cn, formatDate } from "@/lib/utils";

type GuardianOption = {
  id: string;
  fullName: string;
  relation: string;
  email: string | null;
};

type ClassroomOption = {
  id: string;
  name: string;
  gradeLevel: string;
  shift: string;
};

type AcademicYearOption = {
  id: string;
  year: number;
};

type EnrollmentDraft = {
  studentName: string;
  existingGuardianId: string;
  guardianName: string;
  classroomId: string;
  academicYearId: string;
  enrolledAt: string;
};

function formatDateInput(value: string) {
  return value ? formatDate(new Date(`${value}T12:00:00.000Z`)) : "Não informado";
}

export function EnrollmentForm({
  guardians,
  classrooms,
  academicYears,
  defaultEnrollmentDate
}: {
  guardians: GuardianOption[];
  classrooms: ClassroomOption[];
  academicYears: AcademicYearOption[];
  defaultEnrollmentDate: string;
}) {
  const [draft, setDraft] = useEnrollmentDraft({
    studentName: "",
    existingGuardianId: "",
    guardianName: "",
    classroomId: "",
    academicYearId: academicYears[0]?.id ?? "",
    enrolledAt: defaultEnrollmentDate
  });
  const selectedGuardian = guardians.find((guardian) => guardian.id === draft.existingGuardianId);
  const selectedClassroom = classrooms.find((classroom) => classroom.id === draft.classroomId);
  const selectedYear = academicYears.find((year) => year.id === draft.academicYearId);

  return (
    <form
      action={createEnrollment}
      className="grid gap-4"
      onChange={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
        if (!(target.name in draft)) return;
        setDraft({ [target.name]: target.value } as Partial<EnrollmentDraft>);
      }}
    >
      <AdminSection title="1. Dados do aluno" description="Informações pessoais e de contato do estudante.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="studentName" placeholder="Nome completo" required />
          <Input name="studentCpf" placeholder="CPF" />
          <Input name="birthDate" type="date" />
          <Select name="gender" defaultValue="">
            <option value="">Sexo</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Outro">Outro</option>
          </Select>
          <Input name="studentPhone" placeholder="Telefone" />
          <Input name="studentEmail" type="email" placeholder="E-mail" />
          <Input name="address" placeholder="Endereço" className="md:col-span-2" />
        </div>
      </AdminSection>

      <AdminSection
        title="2. Responsável"
        description="Selecione um responsável existente ou preencha os dados para cadastrar um novo."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar responsável existente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select name="existingGuardianId" defaultValue="">
                <option value="">Não usar responsável existente</option>
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.fullName} · {guardian.relation} · {guardian.email ?? "sem e-mail"}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-text-secondary">
                Quando selecionado, o sistema vincula o aluno a esse responsável e ignora os campos de novo cadastro.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cadastrar novo responsável</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Input name="guardianName" placeholder="Nome do responsável" />
              <Input name="guardianCpf" placeholder="CPF do responsável" />
              <Input name="relation" placeholder="Parentesco" />
              <Input name="guardianPhone" placeholder="Telefone" />
              <Input name="guardianEmail" type="email" placeholder="E-mail" className="md:col-span-2" />
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <AdminSection title="3. Informações acadêmicas" description="Turma, ano letivo e data de entrada.">
        <div className="grid gap-4 md:grid-cols-4">
          <Select name="academicYearId" required defaultValue={academicYears[0]?.id}>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </Select>
          <Select name="classroomId" required defaultValue="">
            <option value="">Turma</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} · {classroom.gradeLevel} · {shiftLabel(classroom.shift)}
              </option>
            ))}
          </Select>
          <Input name="enrolledAt" type="date" required defaultValue={defaultEnrollmentDate} />
        </div>
      </AdminSection>

      <AdminSection title="4. Revisão" description="Confira os dados preenchidos antes de concluir.">
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <ReviewItem label="Aluno" value={draft.studentName} fallback="Não informado" />
          <ReviewItem
            label="Responsável"
            value={selectedGuardian?.fullName ?? draft.guardianName}
            fallback="Não informado"
          />
          <ReviewItem
            label="Turma"
            value={
              selectedClassroom
                ? (
                    <span className="grid gap-0.5">
                      <span>{selectedClassroom.name}</span>
                      <span className="text-sm font-medium text-text-secondary">
                        {selectedClassroom.gradeLevel} · {shiftLabel(selectedClassroom.shift)}
                      </span>
                    </span>
                  )
                : ""
            }
            fallback="Não informada"
          />
          <ReviewItem label="Ano letivo" value={selectedYear?.year} fallback="Não informado" />
          <ReviewItem
            label="Data de entrada"
            value={draft.enrolledAt ? formatDateInput(draft.enrolledAt) : ""}
            fallback="Não informado"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Concluir matrícula</Button>
        </div>
      </AdminSection>
    </form>
  );
}

function ReviewItem({
  label,
  value,
  fallback
}: {
  label: string;
  value?: React.ReactNode;
  fallback: string;
}) {
  const isEmpty = value === undefined || value === null || value === "";

  return (
    <div className="min-h-24 rounded-md border border-border bg-muted/20 p-3.5">
      <span className="block text-[11px] font-medium uppercase tracking-normal text-text-muted">{label}</span>
      <span
        className={cn(
          "mt-2 block leading-snug",
          isEmpty
            ? "text-sm font-medium text-text-muted"
            : "text-base font-semibold text-school-navy"
        )}
      >
        {isEmpty ? fallback : value}
      </span>
    </div>
  );
}

function useEnrollmentDraft(initial: EnrollmentDraft) {
  const [draft, setDraftState] = React.useState(initial);

  function setDraft(next: Partial<EnrollmentDraft>) {
    setDraftState((current) => ({ ...current, ...next }));
  }

  return [draft, setDraft] as const;
}
