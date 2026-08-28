import { AcademicHistoryView } from "@/components/academic-history-view";
import { StudentSwitcher } from "@/components/guardian/student-switcher";
import { GuardianEmptyState, GuardianPageHeader } from "@/components/guardian/guardian-ui";
import { guardianFirstName, guardianShiftLabel } from "@/lib/guardian-labels";
import { requireSession } from "@/lib/auth";
import { getGuardianAcademicHistory } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function GuardianAcademicHistoryPage({
  searchParams
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession(["RESPONSAVEL"]);
  const portal = await getGuardianAcademicHistory(session.schoolId, session.id, query.studentId);
  const latestEnrollment = portal.selectedStudent?.enrollments[0] ?? null;
  const classroom = latestEnrollment?.classroom;

  return (
    <main className="guardian-page">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <GuardianPageHeader
          title="Histórico escolar"
          description={`Trajetória acadêmica de ${guardianFirstName(portal.selectedStudent?.fullName ?? "aluno")} por ano letivo.`}
          eyebrow={classroom ? `${classroom.name} · ${guardianShiftLabel(classroom.shift)}` : "Aluno acompanhado"}
        />
        <StudentSwitcher students={portal.children} selectedStudentId={portal.selectedStudent?.id} />
      </div>

      {portal.history ? (
        <AcademicHistoryView history={portal.history} tableClassName="guardian-table" />
      ) : (
        <GuardianEmptyState
          title="Histórico indisponível"
          description="Não encontramos um aluno vinculado a este responsável."
        />
      )}
    </main>
  );
}
