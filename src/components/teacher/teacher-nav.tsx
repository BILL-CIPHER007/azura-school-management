"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Megaphone, School } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/professor/dashboard", label: "Dashboard", icon: Home },
  { href: "/professor/turmas", label: "Minhas Turmas", icon: School },
  { href: "/professor/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/professor/comunicados", label: "Comunicados", icon: Megaphone }
];

export function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:w-full",
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
