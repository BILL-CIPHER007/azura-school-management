import Link from "next/link";
import type { EnrollmentStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminToolbar, RowActions } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  enrollmentStatusLabel,
  enrollmentStatusTone,
  shiftLabel
} from "@/lib/admin-labels";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { listClassrooms, listEnrollmentsAdmin } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function EnrollmentsPage({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; turma?: string; situacao?: EnrollmentStatus }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const params = await searchParams;
  const [enrollments, classrooms] = await Promise.all([
    listEnrollmentsAdmin({
      schoolId: session.schoolId,
      search: params.busca,
      classroomId: params.turma,
      status: params.situacao
    }),
    listClassrooms(session.schoolId)
  ]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Matrículas"
        description="Acompanhe vínculos acadêmicos, responsáveis, turmas e status."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Matrículas" }]}
        action={
          <Button asChild>
            <Link href="/admin/matriculas/nova">Nova matrícula</Link>
          </Button>
        }
      />

      <AdminToolbar>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_190px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input name="busca" placeholder="Buscar por aluno ou matrícula" defaultValue={params.busca} className="pl-9" />
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
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="TRANSFERRED">Transferida</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>
      </AdminToolbar>

      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Matrícula</th>
                <th>Turma</th>
                <th>Ano letivo</th>
                <th>Data</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => {
                const guardian = enrollment.student.guardians[0]?.guardian;
                return (
                  <tr key={enrollment.id}>
                    <td>
                      <Link href={`/admin/alunos/${enrollment.studentId}`} className="font-medium text-primary">
                        {enrollment.student.fullName}
                      </Link>
                    </td>
                    <td>{enrollment.registration}</td>
                    <td>
                      {enrollment.classroom.name}
                      <span className="block text-xs text-muted-foreground">
                        {enrollment.classroom.gradeLevel} · {shiftLabel(enrollment.classroom.shift)}
                      </span>
                    </td>
                    <td>{enrollment.academicYear.year}</td>
                    <td>{formatDate(enrollment.enrolledAt)}</td>
                    <td>
                      <Badge variant={enrollmentStatusTone(enrollment.status)}>
                        {enrollmentStatusLabel(enrollment.status)}
                      </Badge>
                    </td>
                    <td>
                      {guardian ? (
                        <Link href={`/admin/responsaveis/${guardian.id}`} className="text-primary">
                          {guardian.fullName}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <RowActions
                        items={[
                          { label: "Ver aluno", href: `/admin/alunos/${enrollment.studentId}` },
                          { label: "Editar matrícula", disabled: true },
                          { label: "Ver turma", href: `/admin/turmas/${enrollment.classroomId}` }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!enrollments.length ? (
          <div className="p-4">
            <AdminEmptyState title="Nenhuma matrícula encontrada" description="Ajuste os filtros ou inicie uma nova matrícula." />
          </div>
        ) : null}
      </div>
    </main>
  );
}
