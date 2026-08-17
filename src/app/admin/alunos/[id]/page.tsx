import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMetric, AdminPageHeader, AdminSection, DefinitionList } from "@/components/admin/admin-ui";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  academicSituationTone,
  attendanceStatusLabel,
  enrollmentStatusLabel,
  enrollmentStatusTone,
  shiftLabel
} from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { isPassingGrade } from "@/lib/academic-rules";
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
      <AdminPageHeader
        title={student.fullName}
        description="Perfil administrativo com dados pessoais, matrícula, responsáveis, desempenho e frequência."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Alunos", href: "/admin/alunos" },
          { label: student.fullName }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/alunos">Voltar</Link>
            </Button>
            <Button variant="secondary" disabled>Editar aluno</Button>
            <Button variant="secondary" disabled>Editar matrícula</Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <AdminMetric label="Matrícula" value={currentEnrollment?.registration ?? "-"} detail={currentEnrollment?.classroom.name ?? "Sem turma"} />
        <AdminMetric label="Média geral" value={summary.averageGrade.toFixed(1)} detail={summary.situation} tone={academicSituationTone(summary.situation)} />
        <AdminMetric label="Frequência" value={formatPercent(summary.attendanceRate)} detail={`${summary.absences} faltas`} />
        <AdminMetric
          label="Situação"
          value={enrollmentStatusLabel(currentEnrollment?.status)}
          detail={currentEnrollment?.academicYear.year.toString() ?? "Sem matrícula"}
          tone={enrollmentStatusTone(currentEnrollment?.status)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <AdminSection title="Dados pessoais" description="Informações cadastrais usadas pela secretaria.">
          <DefinitionList
            items={[
              { label: "CPF", value: student.cpf },
              { label: "Nascimento", value: student.birthDate ? formatDate(student.birthDate) : "-" },
              { label: "Sexo", value: student.gender },
              { label: "Telefone", value: student.phone },
              { label: "E-mail", value: student.email },
              { label: "Endereço", value: student.address }
            ]}
          />
        </AdminSection>

        <AdminSection title="Matrícula atual" description="Vínculo acadêmico ativo mais recente.">
          <DefinitionList
            items={[
              { label: "Turma", value: currentEnrollment?.classroom.name },
              { label: "Série", value: currentEnrollment?.classroom.gradeLevel },
              { label: "Turno", value: currentEnrollment ? shiftLabel(currentEnrollment.classroom.shift) : "-" },
              { label: "Ano letivo", value: currentEnrollment?.academicYear.year },
              { label: "Data da matrícula", value: currentEnrollment ? formatDate(currentEnrollment.enrolledAt) : "-" },
              {
                label: "Status",
                value: (
                  <Badge variant={enrollmentStatusTone(currentEnrollment?.status)}>
                    {enrollmentStatusLabel(currentEnrollment?.status)}
                  </Badge>
                )
              }
            ]}
          />
        </AdminSection>
      </section>

      <AdminSection title="Responsáveis" description="Contatos e vínculos familiares do aluno.">
        <div className="grid gap-3 md:grid-cols-2">
          {student.guardians.map((item) => (
            <Link
              key={item.guardianId}
              href={`/admin/responsaveis/${item.guardianId}`}
              className="rounded-lg border p-4 hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{item.guardian.fullName}</strong>
                {item.isPrimary ? <Badge variant="info">Principal</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{item.guardian.relation}</p>
              <p className="mt-2 text-sm">{item.guardian.email ?? "-"}</p>
              <p className="text-sm">{item.guardian.phone ?? "-"}</p>
            </Link>
          ))}
        </div>
      </AdminSection>

      <AdminSection id="desempenho" title="Desempenho" description="Notas registradas por disciplina e período.">
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
                  <td>
                    <Badge variant={isPassingGrade(grade.average) ? "success" : "warning"}>{grade.average.toFixed(1)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection id="frequencia" title="Frequência" description="Resumo e últimos registros de chamada.">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-lg border p-4">
            <strong className="text-3xl">{formatPercent(summary.attendanceRate)}</strong>
            <ProgressBar value={summary.attendanceRate} className="mt-3" />
            <p className="mt-2 text-sm text-muted-foreground">{summary.absences} faltas registradas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Disciplina</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentEnrollment?.attendances.slice(0, 12).map((attendance) => (
                  <tr key={attendance.id}>
                    <td>{formatDate(attendance.date)}</td>
                    <td>{attendance.subject.name}</td>
                    <td>{attendanceStatusLabel(attendance.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Histórico de matrícula">
        <div className="grid gap-3 md:grid-cols-2">
          {student.enrollments.map((enrollment) => (
            <div key={enrollment.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>{enrollment.registration}</strong>
                <Badge variant={enrollmentStatusTone(enrollment.status)}>
                  {enrollmentStatusLabel(enrollment.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {enrollment.classroom.name} · {enrollment.academicYear.year}
              </p>
              <p className="mt-1 text-sm">Matrícula em {formatDate(enrollment.enrolledAt)}</p>
            </div>
          ))}
        </div>
      </AdminSection>
    </main>
  );
}
