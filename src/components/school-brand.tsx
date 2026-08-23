import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { cn } from "@/lib/utils";

export function SchoolBrand({
  href,
  compact = false,
  className
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {schoolConfig.branding.logoCompact ? (
        <Image
          src={schoolConfig.branding.logoCompact}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg object-contain"
          priority
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {schoolConfig.initials}
        </span>
      )}
      {!compact ? <span className="truncate">{schoolConfig.name}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("flex min-w-0 items-center gap-2 font-semibold", className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn("flex min-w-0 items-center gap-2 font-semibold", className)}>{content}</div>;
}

export function DemoBadge({ className }: { className?: string }) {
  if (!schoolConfig.demo.isDemo) return null;
  return <Badge className={className}>{schoolConfig.demo.badgeLabel}</Badge>;
}
