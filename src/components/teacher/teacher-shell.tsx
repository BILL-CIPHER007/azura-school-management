import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { DemoBadge, SchoolBrand } from "@/components/school-brand";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/session";
import { initials } from "@/lib/teacher-labels";
import { TeacherNav } from "@/components/teacher/teacher-nav";

export function TeacherShell({
  session,
  children
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="border-b bg-white/95 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-start lg:gap-4 lg:px-4 lg:py-5">
          <SchoolBrand href="/professor/dashboard" />
          <DemoBadge className="whitespace-nowrap" />
        </div>

        <TeacherNav />

        <form action={logout} className="hidden border-t p-3 lg:block">
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">Área do professor</p>
          </div>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{session.name}</p>
                <p className="text-xs text-muted-foreground">Professor</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(session.name)}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="absolute right-0 mt-2 w-52 rounded-lg border bg-white p-2 shadow-lg">
              <Link
                href="/professor/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <UserRound className="h-4 w-4" />
                Meu perfil
              </Link>
              <form action={logout}>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </details>
        </header>

        {children}
      </div>
    </div>
  );
}
