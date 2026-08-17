import { TeacherShell } from "@/components/teacher/teacher-shell";
import { requireSession } from "@/lib/auth";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["PROFESSOR"]);
  return <TeacherShell session={session}>{children}</TeacherShell>;
}
