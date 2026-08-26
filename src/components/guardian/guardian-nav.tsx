"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardCheck, Home, Megaphone, NotebookTabs } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/responsavel/dashboard", label: "Início", icon: Home },
  { href: "/responsavel/boletim", label: "Boletim", icon: NotebookTabs },
  { href: "/responsavel/frequencia", label: "Frequência", icon: ClipboardCheck },
  { href: "/responsavel/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/responsavel/comunicados", label: "Comunicados", icon: Megaphone }
];

export function GuardianNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  return (
    <nav className="relative flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const href = studentId ? `${item.href}?studentId=${encodeURIComponent(studentId)}` : item.href;

        return (
          <Link
            key={item.href}
            href={href}
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
