import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { schoolConfig } from "@/config/school";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{schoolConfig.name}</p>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {detail ? (
        <CardContent>
          <Badge variant={tone}>{detail}</Badge>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted", className)}>
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
