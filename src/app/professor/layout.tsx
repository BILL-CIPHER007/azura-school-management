import { TeacherShell } from "@/components/teacher/teacher-shell";
import { requireSession } from "@/lib/auth";
import { getActiveAcademicYearLabel } from "@/services/school-data";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["PROFESSOR"]);
  const academicYear = await getActiveAcademicYearLabel(session.schoolId);
  return (
    <TeacherShell session={session} academicYear={academicYear}>
      {children}
    </TeacherShell>
  );
}
