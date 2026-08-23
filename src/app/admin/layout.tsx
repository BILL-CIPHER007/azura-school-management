import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ADMIN"]);
  const academicYear = await getActiveAcademicYearLabel(session.schoolId);
  return (
    <AppShell session={session} academicYear={academicYear}>
      {children}
    </AppShell>
  );
}
