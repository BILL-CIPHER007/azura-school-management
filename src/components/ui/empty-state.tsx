import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-surface-muted p-8 text-center", className)}>
      {Icon ? (
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-school-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="font-semibold text-text-primary">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function EmptyStateAction(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />;
}
