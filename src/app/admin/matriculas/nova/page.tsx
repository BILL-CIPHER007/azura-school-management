import { createEnrollment } from "@/app/actions/academic";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { schoolConfig } from "@/config/school";
import { shiftLabel } from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { getEnrollmentOptions } from "@/services/school-data";

export const dynamic = "force-dynamic";

const steps = ["Dados do aluno", "Responsável", "Informações acadêmicas", "Revisão"];

export default async function NewEnrollmentPage() {
  const session = await requireSession(["ADMIN"]);
  const { guardians, classrooms, academicYears } = await getEnrollmentOptions(session.schoolId);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Nova matrícula"
        description="Cadastre aluno, responsável e vínculo acadêmico em um fluxo único."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Matrículas", href: "/admin/matriculas" },
          { label: "Nova matrícula" }
        ]}
      />

      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-md bg-muted/50 p-3 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <span className="font-medium">{step}</span>
          </div>
        ))}
      </div>

      <form action={createEnrollment} className="grid gap-4">
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
                <p className="text-sm text-muted-foreground">
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
            <Input name="enrolledAt" type="date" required defaultValue={schoolConfig.academic.defaultEnrollmentDate} />
          </div>
        </AdminSection>

        <AdminSection title="4. Revisão" description="Confira os dados preenchidos antes de concluir.">
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-5">
            <div className="rounded-md border p-3">
              <strong className="block text-foreground">Aluno</strong>
              Dados pessoais preenchidos acima
            </div>
            <div className="rounded-md border p-3">
              <strong className="block text-foreground">Responsável</strong>
              Existente ou novo cadastro
            </div>
            <div className="rounded-md border p-3">
              <strong className="block text-foreground">Turma</strong>
              Selecionada nas informações acadêmicas
            </div>
            <div className="rounded-md border p-3">
              <strong className="block text-foreground">Ano letivo</strong>
              Vinculado ao período ativo
            </div>
            <Button type="submit" className="h-full min-h-16">
              Concluir matrícula
            </Button>
          </div>
        </AdminSection>
      </form>
    </main>
  );
}
