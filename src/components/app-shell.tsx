import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  NotebookTabs,
  School,
  Settings,
  Users,
  UsersRound
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { logout } from "@/app/actions/auth";
import { DemoBadge, SchoolBrand } from "@/components/school-brand";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/session";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: Home },
    { href: "/admin/alunos", label: "Alunos", icon: GraduationCap },
    { href: "/admin/matriculas/nova", label: "Matrículas", icon: ClipboardCheck },
    { href: "/admin/responsaveis", label: "Responsáveis", icon: UsersRound },
    { href: "/admin/professores", label: "Professores", icon: Users },
    { href: "/admin/turmas", label: "Turmas", icon: School },
    { href: "/admin/disciplinas", label: "Disciplinas", icon: BookCopy },
    { href: "/admin/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/admin/comunicados", label: "Comunicados", icon: Megaphone },
    { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings }
  ],
  PROFESSOR: [
    { href: "/professor/dashboard", label: "Dashboard", icon: Home },
    { href: "/professor/turmas", label: "Minhas Turmas", icon: School },
    { href: "/professor/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/professor/comunicados", label: "Comunicados", icon: Megaphone }
  ],
  ALUNO: [
    { href: "/aluno/dashboard", label: "Início", icon: Home },
    { href: "/aluno/boletim", label: "Boletim", icon: NotebookTabs },
    { href: "/aluno/frequencia", label: "Frequência", icon: ClipboardCheck },
    { href: "/aluno/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/aluno/comunicados", label: "Comunicados", icon: Megaphone },
    { href: "/aluno/perfil", label: "Meu Perfil", icon: Users }
  ],
  RESPONSAVEL: [
    { href: "/responsavel/dashboard", label: "Início", icon: Home },
    { href: "/responsavel/boletim", label: "Boletim", icon: NotebookTabs },
    { href: "/responsavel/frequencia", label: "Frequência", icon: ClipboardCheck },
    { href: "/responsavel/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/responsavel/comunicados", label: "Comunicados", icon: Megaphone }
  ]
};

export function AppShell({
  session,
  children
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const items = navigation[session.role];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b bg-card lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5 lg:h-auto lg:flex-col lg:items-start lg:gap-6 lg:py-6">
          <SchoolBrand href="/" />
          <DemoBadge />
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:w-full"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="hidden border-t p-3 lg:block">
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-muted-foreground">Sessão atual</p>
            <strong className="text-sm">{session.name}</strong>
          </div>
          <form action={logout} className="lg:hidden">
            <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
