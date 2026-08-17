import Link from "next/link";
import type { EnrollmentStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { PageHeader, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireSession } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/utils";
import { listClassrooms, listStudents } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; turma?: string; situacao?: EnrollmentStatus }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const [students, classrooms] = await Promise.all([
    listStudents({
      schoolId: session.schoolId,
      search: params.busca,
      classroomId: params.turma,
      status: params.situacao
    }),
    listClassrooms(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <PageHeader
        title="Alunos"
        description="Busca, filtros e acompanhamento acadêmico dos alunos."
        action={
          <Button asChild>
            <Link href="/admin/matriculas/nova">Novo aluno</Link>
          </Button>
        }
      />

      <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_220px_180px_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input name="busca" placeholder="Buscar por nome" defaultValue={params.busca} className="pl-9" />
        </label>
        <Select name="turma" defaultValue={params.turma ?? ""}>
          <option value="">Todas as turmas</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </Select>
        <Select name="situacao" defaultValue={params.situacao ?? ""}>
          <option value="">Todas as situações</option>
          <option value="ACTIVE">Ativa</option>
          <option value="TRANSFERRED">Transferida</option>
          <option value="COMPLETED">Concluída</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
        <Button type="submit">Filtrar</Button>
      </form>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Matrícula</th>
                <th>Turma</th>
                <th>Série</th>
                <th>Responsável</th>
                <th>Situação</th>
                <th>Frequência</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const enrollment = student.enrollments[0];
                const attendance = enrollment?.attendances ?? [];
                const rate = attendance.length
                  ? (attendance.filter((item) => item.status === "PRESENT").length /
                      attendance.length) *
                    100
                  : 0;
                return (
                  <tr key={student.id}>
                    <td>
                      <Link className="font-medium text-primary" href={`/admin/alunos/${student.id}`}>
                        {student.fullName}
                      </Link>
                    </td>
                    <td>{enrollment?.registration ?? "-"}</td>
                    <td>{enrollment?.classroom.name ?? "-"}</td>
                    <td>{enrollment?.classroom.gradeLevel ?? "-"}</td>
                    <td>{student.guardians[0]?.guardian.fullName ?? "-"}</td>
                    <td>
                      <Badge variant="success">{enrollment?.status ?? "Sem matrícula"}</Badge>
                    </td>
                    <td>
                      <div className="w-32">
                        <ProgressBar value={rate} />
                        <span className="text-xs text-muted-foreground">{formatPercent(rate)}</span>
                      </div>
                    </td>
                    <td>{enrollment ? formatDate(enrollment.enrolledAt) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          Mostrando até 50 resultados. Paginação preparada para expansão do MVP.
        </div>
      </div>
    </main>
  );
}
