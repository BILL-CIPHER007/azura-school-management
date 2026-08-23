import { GuardianShell } from "@/components/guardian/guardian-shell";
import { requireSession } from "@/lib/auth";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["RESPONSAVEL"]);
  const academicYear = await getActiveAcademicYearLabel(session.schoolId);
  return (
    <GuardianShell session={session} academicYear={academicYear}>
      {children}
    </GuardianShell>
  );
}
