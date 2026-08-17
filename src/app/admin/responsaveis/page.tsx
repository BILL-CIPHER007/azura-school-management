import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { listGuardians } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardiansPage() {
  const session = await requireSession(["ADMIN"]);
  const guardians = await listGuardians(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Responsáveis" description="Relacionamento muitos-para-muitos entre responsáveis e alunos." />
      <div className="table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Parentesco</th>
                <th>Contato</th>
                <th>Alunos vinculados</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td className="font-medium">{guardian.fullName}</td>
                  <td>{guardian.relation}</td>
                  <td>{guardian.email}</td>
                  <td className="space-x-1">
                    {guardian.students.map((item) => (
                      <Badge key={item.studentId} variant={item.isPrimary ? "info" : "neutral"}>
                        {item.student.fullName}
                      </Badge>
                    ))}
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
