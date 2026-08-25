import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { schoolConfig } from "@/config/school";
import { cn } from "@/lib/utils";

type SchoolBrandVariant = "full" | "full-dark" | "horizontal" | "horizontal-dark" | "symbol";

const logoDimensions: Record<SchoolBrandVariant, { width: number; height: number; alt: string; className: string }> = {
  full: {
    width: 2172,
    height: 724,
    alt: "Azura — Sistema de Gestão Escolar",
    className: "h-14 w-auto object-contain"
  },
  "full-dark": {
    width: 2172,
    height: 724,
    alt: "Azura — Sistema de Gestão Escolar",
    className: "h-14 w-auto object-contain"
  },
  horizontal: {
    width: 2172,
    height: 724,
    alt: "Azura",
    className: "h-10 w-auto object-contain"
  },
  "horizontal-dark": {
    width: 2172,
    height: 724,
    alt: "Azura",
    className: "h-10 w-auto object-contain"
  },
  symbol: {
    width: 1254,
    height: 1254,
    alt: "Azura",
    className: "h-9 w-9 object-contain"
  }
};

export function SchoolBrand({
  href,
  compact = false,
  variant,
  className,
  imageClassName,
  width,
  height,
  priority = true
}: {
  href?: string;
  compact?: boolean;
  variant?: SchoolBrandVariant;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const selectedVariant = variant ?? (compact ? "symbol" : "horizontal");
  const logo = logoDimensions[selectedVariant];
  const src =
    selectedVariant === "full-dark"
      ? schoolConfig.branding.logos.fullDark
      : selectedVariant === "horizontal-dark"
        ? schoolConfig.branding.logos.horizontalDark
        : schoolConfig.branding.logos[selectedVariant];
  const content = (
    <span className="flex min-w-0 items-center">
      {src ? (
        <Image
          src={src}
          alt={logo.alt}
          width={width ?? logo.width}
          height={height ?? logo.height}
          className={cn(logo.className, imageClassName)}
          preload={priority}
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {schoolConfig.initials}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cn("flex min-w-0 items-center", className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn("flex min-w-0 items-center", className)}>{content}</div>;
}

export function DemoBadge({ className }: { className?: string }) {
  if (!schoolConfig.demo.isDemo) return null;
  return <Badge className={className}>{schoolConfig.demo.badgeLabel}</Badge>;
}
