import { GuardianShell } from "@/components/guardian/guardian-shell";
import { requireSession } from "@/lib/auth";

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["RESPONSAVEL"]);
  return <GuardianShell session={session}>{children}</GuardianShell>;
}
