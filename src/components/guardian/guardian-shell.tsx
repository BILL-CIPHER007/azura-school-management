import { ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { DemoBadge, SchoolBrand } from "@/components/school-brand";
import { Button } from "@/components/ui/button";
import { GuardianNav } from "@/components/guardian/guardian-nav";
import type { SessionUser } from "@/lib/session";
import { guardianInitials } from "@/lib/guardian-labels";

export function GuardianShell({
  session,
  children
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sky-50/60 lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="hidden border-r bg-white/95 lg:block lg:min-h-screen">
        <div className="flex flex-col items-start gap-4 px-4 py-5">
          <SchoolBrand href="/responsavel/dashboard" />
          <DemoBadge className="whitespace-nowrap" />
        </div>

        <GuardianNav />

        <form action={logout} className="border-t p-3">
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <details className="group relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md p-2 hover:bg-muted">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </summary>
            <div className="absolute left-0 mt-2 w-64 rounded-lg border bg-white shadow-lg">
              <div className="border-b px-4 py-3">
                <SchoolBrand compact />
                <DemoBadge className="mt-2" />
              </div>
              <GuardianNav onMobile />
              <form action={logout} className="border-t p-2">
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted">
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </details>

          <p className="hidden text-sm font-medium text-foreground lg:block">Área do responsável</p>

          <details className="group relative ml-auto">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{session.name}</p>
                <p className="text-xs text-muted-foreground">Responsável</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {guardianInitials(session.name)}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="absolute right-0 mt-2 w-52 rounded-lg border bg-white p-2 shadow-lg">
              <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                Minha conta
              </div>
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
