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

export function GuardianNav({ onMobile = false }: { onMobile?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  return (
    <nav className={cn("flex gap-1", onMobile ? "flex-col p-2" : "flex-col px-3 pb-3")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const href = studentId ? `${item.href}?studentId=${encodeURIComponent(studentId)}` : item.href;

        return (
          <Link
            key={item.href}
            href={href}
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
