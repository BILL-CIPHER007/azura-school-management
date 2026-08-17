import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ADMIN"]);
  return <AppShell session={session}>{children}</AppShell>;
}
