import type * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("h-10 w-10 rounded-full border border-border object-cover shadow-sm", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full bg-school-primary-soft text-sm font-semibold text-school-blue-700 ring-1 ring-school-blue-100",
        className
      )}
    >
      {initials}
    </span>
  );
}
