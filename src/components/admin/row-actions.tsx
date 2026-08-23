"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

type RowActionItem = {
  label: string;
  href?: string;
  disabled?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_WIDTH = 208;

export function RowActions({ items }: { items: RowActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const button = buttonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const viewportPadding = 12;
      const estimatedHeight = items.length * 36 + 12;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - viewportPadding
      );
      const preferredTop = rect.bottom + 8;
      const top =
        preferredTop + estimatedHeight > window.innerHeight - viewportPadding
          ? Math.max(viewportPadding, rect.top - estimatedHeight - 8)
          : preferredTop;

      setPosition({
        left,
        top
      });
    };

    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [items.length, open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-surface text-text-secondary shadow-sm hover:bg-school-primary-soft hover:text-school-primary"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Abrir ações</span>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-50 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
              style={{ left: position.left, top: position.top }}
            >
              {items.map((item) =>
                item.href && !item.disabled ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    role="menuitem"
                    className="block rounded-md px-3 py-2 text-sm text-text-primary hover:bg-school-primary-soft hover:text-school-primary"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    role="menuitem"
                    aria-disabled="true"
                    className="block rounded-md px-3 py-2 text-sm text-text-muted opacity-80"
                  >
                    {item.label}
                  </span>
                )
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
