import { StudentShell } from "@/components/student/student-shell";
import { requireSession } from "@/lib/auth";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ALUNO"]);
  return <StudentShell session={session}>{children}</StudentShell>;
}
