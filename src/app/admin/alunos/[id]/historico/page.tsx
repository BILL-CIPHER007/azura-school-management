import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademicHistoryView } from "@/components/academic-history-view";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getAdminStudentAcademicHistory } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function AdminStudentAcademicHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const history = await getAdminStudentAcademicHistory(session.schoolId, id);
  if (!history) notFound();

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Histórico escolar"
        description="Trajetória acadêmica consolidada por matrícula, ano letivo e disciplina."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Alunos", href: "/admin/alunos" },
          { label: history.student.fullName, href: `/admin/alunos/${history.student.id}` },
          { label: "Histórico" }
        ]}
        action={
          <Button asChild variant="outline">
            <Link href={`/admin/alunos/${history.student.id}`}>Voltar ao aluno</Link>
          </Button>
        }
      />

      <AcademicHistoryView history={history} tableClassName="data-table" />
    </main>
  );
}
