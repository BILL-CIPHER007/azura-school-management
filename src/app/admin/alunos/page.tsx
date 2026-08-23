import Link from "next/link";
import type { EnrollmentStatus } from "@prisma/client";
import { AdminStudentFilters } from "@/app/admin/alunos/admin-student-filters";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/admin-ui";
import { RowActions } from "@/components/admin/row-actions";
import { ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { isAttendanceBelowMinimum } from "@/lib/academic-rules";
import { enrollmentStatusLabel, enrollmentStatusTone, shiftLabel } from "@/lib/admin-labels";
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
      <AdminPageHeader
        title="Alunos"
        description="Busca, filtros, status da matrícula e acompanhamento dos alunos."
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Alunos" }]}
      />

      <AdminToolbar>
        <AdminStudentFilters
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
                <th>Nome</th>
                <th>Matrícula</th>
                <th>Turma</th>
                <th>Série</th>
                <th>Responsável</th>
                <th>Status da matrícula</th>
                <th>Frequência</th>
                <th>Data da matrícula</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const enrollment = student.enrollments[0];
                const attendance = enrollment?.attendances ?? [];
                const rate = attendance.length
                  ? (attendance.filter((item) => item.status === "PRESENT").length / attendance.length) * 100
                  : 0;
                const guardian = student.guardians[0]?.guardian;
                const belowMinimum = attendance.length > 0 && isAttendanceBelowMinimum(rate);

                return (
                  <tr key={student.id}>
                    <td>
                      <Link className="font-medium text-primary" href={`/admin/alunos/${student.id}`}>
                        {student.fullName}
                      </Link>
                    </td>
                    <td>{enrollment?.registration ?? "-"}</td>
                    <td>
                      {enrollment?.classroom.name ?? "-"}
                      {enrollment?.classroom.shift ? (
                        <span className="block text-xs text-text-muted">
                          {shiftLabel(enrollment.classroom.shift)}
                        </span>
                      ) : null}
                    </td>
                    <td>{enrollment?.classroom.gradeLevel ?? "-"}</td>
                    <td>{guardian?.fullName ?? "-"}</td>
                    <td>
                      <Badge variant={enrollmentStatusTone(enrollment?.status)}>
                        {enrollmentStatusLabel(enrollment?.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="w-36">
                        <ProgressBar value={rate} />
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={belowMinimum ? "text-xs font-medium text-warning" : "text-xs text-text-muted"}>
                            {formatPercent(rate)}
                          </span>
                          {belowMinimum ? <Badge variant="warning">Abaixo do mínimo</Badge> : null}
                        </div>
                      </div>
                    </td>
                    <td>{enrollment ? formatDate(enrollment.enrolledAt) : "-"}</td>
                    <td>
                      <RowActions
                        items={[
                          { label: "Ver perfil", href: `/admin/alunos/${student.id}` },
                          {
                            label: "Ver matrícula",
                            href: enrollment ? `/admin/matriculas?busca=${encodeURIComponent(enrollment.registration)}` : undefined
                          },
                          { label: "Ver boletim", href: `/admin/alunos/${student.id}#desempenho` },
                          { label: "Ver frequência", href: `/admin/alunos/${student.id}#frequencia` }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!students.length ? (
          <div className="p-4">
            <AdminEmptyState
              title="Nenhum aluno encontrado"
              description="Tente ajustar a busca ou os filtros selecionados."
            />
          </div>
        ) : (
          <div className="border-t px-4 py-3 text-sm text-text-muted">
            Mostrando até 50 resultados. Paginação preparada para expansão do MVP.
          </div>
        )}
      </div>
    </main>
  );
}
