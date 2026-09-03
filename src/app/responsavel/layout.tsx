import { GuardianShell } from "@/components/guardian/guardian-shell";
import { requireSession } from "@/lib/auth";
import { getFinancialFeatureAccess } from "@/services/financial";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["RESPONSAVEL"]);
  const [academicYear, financialEnabled] = await Promise.all([
    getActiveAcademicYearLabel(session.schoolId),
    getFinancialFeatureAccess(session.schoolId)
  ]);
  return (
    <GuardianShell session={session} academicYear={academicYear} financialEnabled={financialEnabled}>
      {children}
    </GuardianShell>
  );
}
