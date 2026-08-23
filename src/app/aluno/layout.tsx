import { StudentShell } from "@/components/student/student-shell";
import { requireSession } from "@/lib/auth";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ALUNO"]);
  const academicYear = await getActiveAcademicYearLabel(session.schoolId);
  return (
    <StudentShell session={session} academicYear={academicYear}>
      {children}
    </StudentShell>
  );
}
