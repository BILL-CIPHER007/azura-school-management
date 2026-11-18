import { AcademicHistoryView } from "@/components/academic-history-view";
import { StudentEmptyState, StudentPageHeader } from "@/components/student/student-ui";
import { Button } from "@/components/ui/button";
import { canDownload, getDocumentPolicies } from "@/lib/document-policy";
import { requireSession } from "@/lib/auth";
import { getStudentAcademicHistory } from "@/services/school-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentAcademicHistoryPage() {
  const session = await requireSession(["ALUNO"]);
  const policies = await getDocumentPolicies(session.schoolId);
  const history = await getStudentAcademicHistory(session.schoolId, session.id);

  if (!history) {
    return (
      <main className="student-page">
        <StudentPageHeader
          title="Histórico escolar"
          description="Consulte sua trajetória acadêmica por ano letivo."
          eyebrow="Meu histórico"
        />
        <StudentEmptyState
          title="Histórico indisponível"
          description="Não encontramos um aluno vinculado a este acesso."
        />
      </main>
    );
  }

  return (
    <main className="student-page">
      <StudentPageHeader
        title="Histórico escolar"
        description="Sua trajetória acadêmica consolidada por ano letivo, disciplina, média e frequência."
        eyebrow={history.student.fullName}
        action={
          <>
            {history.enrollments[0]?.enrollmentStatus === "ACTIVE" && canDownload(session.role, policies.DECLARACAO_MATRICULA) && (
              <Button asChild variant="outline" size="sm">
                <Link href="/api/documentos/declaracao-matricula">Declaração de matrícula</Link>
              </Button>
            )}
            {canDownload(session.role, policies.HISTORICO_ESCOLAR) && (
              <Button asChild size="sm">
                <Link href="/api/documentos/historico">Baixar histórico</Link>
              </Button>
            )}
          </>
        }
      />

      <AcademicHistoryView history={history} tableClassName="student-table" />
    </main>
  );
}
