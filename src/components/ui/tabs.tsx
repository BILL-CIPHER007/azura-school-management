import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  href?: string;
};

export function Tabs({
  items,
  activeId,
  className
}: {
  items: TabItem[];
  activeId: string;
  className?: string;
}) {
  return (
    <nav className={cn("flex gap-2 overflow-x-auto rounded-lg border bg-card p-2", className)}>
      {items.map((item) => {
        const active = item.id === activeId;
        const classes = cn(
          "inline-flex min-w-fit items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-school-primary-soft hover:text-school-navy"
        );

        return item.href ? (
          <Link key={item.id} href={item.href} className={classes}>
            {item.label}
          </Link>
        ) : (
          <span key={item.id} className={classes}>
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
