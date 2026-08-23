import Link from "next/link";
import type { EnrollmentStatus } from "@prisma/client";
import { AdminEnrollmentFilters } from "@/app/admin/matriculas/admin-enrollment-filters";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <AdminEnrollmentFilters
          classrooms={classrooms}
          selectedSearch={params.busca}
          selectedClassroom={params.turma}
          selectedStatus={params.situacao}
        />
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
                <th>Data da matrícula</th>
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
            <AdminEmptyState
              title="Nenhuma matrícula encontrada"
              description="Tente ajustar a busca ou os filtros selecionados."
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
