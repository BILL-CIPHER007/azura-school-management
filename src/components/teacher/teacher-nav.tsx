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
    <nav className="relative flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-4 lg:pb-6">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-w-fit items-center gap-3 rounded-md px-3.5 py-3 text-sm font-medium transition-colors lg:w-full",
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
