"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardCheck, Home, Megaphone, NotebookTabs, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/aluno/dashboard", label: "Início", icon: Home },
  { href: "/aluno/boletim", label: "Boletim", icon: NotebookTabs },
  { href: "/aluno/frequencia", label: "Frequência", icon: ClipboardCheck },
  { href: "/aluno/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/aluno/comunicados", label: "Comunicados", icon: Megaphone },
  { href: "/aluno/perfil", label: "Meu Perfil", icon: UserRound }
];

export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav className="relative flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-4">
      {items.map((item) => {
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
