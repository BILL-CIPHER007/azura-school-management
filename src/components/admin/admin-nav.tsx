"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  Home,
  Megaphone,
  School,
  Settings,
  Users,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const adminNavigation: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/alunos", label: "Alunos", icon: GraduationCap },
  { href: "/admin/matriculas", label: "Matrículas", icon: ClipboardCheck },
  { href: "/admin/responsaveis", label: "Responsáveis", icon: UsersRound },
  { href: "/admin/professores", label: "Professores", icon: Users },
  { href: "/admin/turmas", label: "Turmas", icon: School },
  { href: "/admin/disciplinas", label: "Disciplinas", icon: BookCopy },
  { href: "/admin/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/admin/comunicados", label: "Comunicados", icon: Megaphone },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="relative flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-none lg:flex-col lg:overflow-visible lg:px-3 lg:pb-3">
      {adminNavigation.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors lg:min-h-9 lg:w-full",
              active ? "bg-school-primary text-white shadow-sm" : "text-white/78 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
