import { AcademicHistoryView } from "@/components/academic-history-view";
import { StudentEmptyState, StudentPageHeader } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { getStudentAcademicHistory } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function StudentAcademicHistoryPage() {
  const session = await requireSession(["ALUNO"]);
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
      />

      <AcademicHistoryView history={history} tableClassName="student-table" />
    </main>
  );
}
