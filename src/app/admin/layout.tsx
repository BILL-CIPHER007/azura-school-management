import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { getFinancialFeatureAccess } from "@/services/financial";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ADMIN"]);
  const [academicYear, financialEnabled] = await Promise.all([
    getActiveAcademicYearLabel(session.schoolId),
    getFinancialFeatureAccess(session.schoolId)
  ]);
  return (
    <AppShell session={session} academicYear={academicYear} financialEnabled={financialEnabled}>
      {children}
    </AppShell>
  );
}
