import Link from "next/link";
import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { listTeachers } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const session = await requireSession(["ADMIN"]);
  const teachers = await listTeachers(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Professores" description="Disciplinas, turmas e status da equipe docente." />
      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Disciplinas</th>
                <th>Turmas</th>
                <th>E-mail</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>
                    <Link className="font-medium text-primary" href={`/admin/professores/${teacher.id}`}>
                      {teacher.fullName}
                    </Link>
                  </td>
                  <td>{[...new Set(teacher.assignments.map((item) => item.subject.name))].join(", ")}</td>
                  <td>{[...new Set(teacher.assignments.map((item) => item.classroom.name))].join(", ")}</td>
                  <td>{teacher.email}</td>
                  <td>
                    <Badge variant="success">{teacher.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
