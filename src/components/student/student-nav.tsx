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

export function StudentNav({ onMobile = false }: { onMobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", onMobile ? "flex-col p-2" : "flex-col px-3 pb-3")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-primary/10 text-primary ring-1 ring-primary/15"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
