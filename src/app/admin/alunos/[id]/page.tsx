import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/utils";
import { getStudentDetails, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const student = await getStudentDetails(session.schoolId, id);
  if (!student) notFound();

  const currentEnrollment = student.enrollments[0] ?? null;
  const summary = summarizeEnrollment(currentEnrollment);

  return (
    <main className="page-shell">
      <PageHeader
        title={student.fullName}
        description="Dados pessoais, acadêmicos, responsáveis, notas e frequência."
        action={
          <ButtonLink href="/admin/alunos">Voltar</ButtonLink>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Turma atual</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {currentEnrollment?.classroom.name ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Média geral</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.averageGrade.toFixed(1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="text-2xl">{formatPercent(summary.attendanceRate)}</strong>
            <ProgressBar value={summary.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Situação</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={summary.situation === "Aprovado" ? "success" : "warning"}>
              {summary.situation}
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="CPF" value={student.cpf} />
            <Info label="Nascimento" value={student.birthDate ? formatDate(student.birthDate) : "-"} />
            <Info label="Sexo" value={student.gender} />
            <Info label="Telefone" value={student.phone} />
            <Info label="E-mail" value={student.email} />
            <Info label="Endereço" value={student.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {student.guardians.map((item) => (
              <div key={item.guardianId} className="rounded-lg border p-4">
                <strong>{item.guardian.fullName}</strong>
                <p className="text-sm text-muted-foreground">{item.guardian.relation}</p>
                <p className="mt-2 text-sm">{item.guardian.email}</p>
                <p className="text-sm">{item.guardian.phone}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Período</th>
                  <th>AV1</th>
                  <th>AV2</th>
                  <th>Trabalho</th>
                  <th>Média</th>
                </tr>
              </thead>
              <tbody>
                {currentEnrollment?.grades.map((grade) => (
                  <tr key={grade.id}>
                    <td>{grade.subject.name}</td>
                    <td>{grade.academicPeriod.name}</td>
                    <td>{grade.av1.toFixed(1)}</td>
                    <td>{grade.av2.toFixed(1)}</td>
                    <td>{grade.assignment.toFixed(1)}</td>
                    <td>{grade.average.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de matrícula</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {student.enrollments.map((enrollment) => (
            <div key={enrollment.id} className="rounded-lg border p-4">
              <strong>{enrollment.registration}</strong>
              <p className="text-sm text-muted-foreground">
                {enrollment.classroom.name} · {enrollment.academicYear.year}
              </p>
              <p className="mt-1 text-sm">Matrícula em {formatDate(enrollment.enrolledAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="flex justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </p>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
    >
      {children}
    </Link>
  );
}
