import { createEnrollment } from "@/app/actions/academic";
import { PageHeader } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { schoolConfig } from "@/config/school";
import { requireSession } from "@/lib/auth";
import { getEnrollmentOptions } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function NewEnrollmentPage() {
  const session = await requireSession(["ADMIN"]);
  const { guardians, classrooms, academicYears } = await getEnrollmentOptions(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader
        title="Nova matrícula"
        description="Cadastre aluno, responsável e vínculo acadêmico em um único fluxo."
      />

      <form action={createEnrollment} className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados do aluno</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsável</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Select name="existingGuardianId" defaultValue="">
              <option value="">Cadastrar novo responsável</option>
              {guardians.map((guardian) => (
                <option key={guardian.id} value={guardian.id}>
                  {guardian.fullName}
                </option>
              ))}
            </Select>
            <Input name="guardianName" placeholder="Nome do responsável" />
            <Input name="guardianCpf" placeholder="CPF do responsável" />
            <Input name="relation" placeholder="Parentesco" />
            <Input name="guardianPhone" placeholder="Telefone" />
            <Input name="guardianEmail" type="email" placeholder="E-mail" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações acadêmicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
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
                  {classroom.name} · {classroom.shift}
                </option>
              ))}
            </Select>
            <Input name="enrolledAt" type="date" required defaultValue={schoolConfig.academic.defaultEnrollmentDate} />
            <Button type="submit">Concluir matrícula</Button>
          </CardContent>
        </Card>
      </form>
    </main>
  );
}
