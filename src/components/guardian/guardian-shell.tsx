import { CalendarDays, ChevronDown, LogOut, UserRound } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { DemoBadge, SchoolBrand } from "@/components/school-brand";
import { GuardianNav } from "@/components/guardian/guardian-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/session";

export function GuardianShell({
  session,
  academicYear,
  children
}: {
  session: SessionUser;
  academicYear: number;
  children: React.ReactNode;
}) {
  return (
    <div className="guardian-root min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="relative overflow-hidden border-b bg-school-navy text-white shadow-lg lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:border-b-0">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(143deg,transparent_0_34%,hsl(var(--school-blue-700))_35%_56%,hsl(var(--school-primary))_57%_100%)] opacity-70" />
        <div className="relative flex h-20 items-center justify-between px-5 lg:h-auto lg:flex-col lg:items-start lg:gap-5 lg:px-5 lg:py-8">
          <SchoolBrand
            href="/responsavel/dashboard"
            variant="horizontal-dark"
            className="w-fit"
            imageClassName="h-10 max-w-[162px]"
          />
          <DemoBadge className="hidden bg-white/10 text-white ring-white/20 lg:inline-flex" />
        </div>

        <GuardianNav />

        <form action={logout} className="relative mt-auto hidden border-t border-white/10 p-4 lg:block">
          <Button type="submit" variant="ghost" className="w-full justify-start text-white hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">Área do responsável</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Ano letivo {academicYear}
            </div>
          </div>

          <details className="group relative ml-auto">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-1.5 hover:bg-school-primary-soft">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-text-primary">{session.name}</p>
                <p className="text-xs text-text-muted">Responsável</p>
              </div>
              <Avatar name={session.name} className="h-10 w-10" />
              <ChevronDown className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" />
            </summary>

            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-lg">
              <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary">
                <UserRound className="h-4 w-4" />
                Minha conta
              </div>
              <form action={logout}>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-school-primary-soft">
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
